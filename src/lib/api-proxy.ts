import { NextRequest, NextResponse } from 'next/server';

export const BACKEND_BASE = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000'
).replace(/\/+$/, '');

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
]);

/** No reenviar al cliente: el fetch de Node ya descomprime el body. */
export const STRIP_RESPONSE_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'content-encoding',
  'content-length',
]);

/** Pedir respuesta sin comprimir al backend para evitar doble codificación en el proxy. */
export const STRIP_REQUEST_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'host',
  'accept-encoding',
]);

export function rewriteSetCookie(cookie: string): string {
  let rewritten = cookie.replace(/;\s*Domain=[^;]*/gi, '');

  if (process.env.NODE_ENV === 'development') {
    rewritten = rewritten.replace(/;\s*Secure/gi, '');
  }

  if (/;\s*SameSite=None/i.test(rewritten)) {
    rewritten = rewritten.replace(/;\s*SameSite=None/i, '; SameSite=Lax');
  } else if (!/;\s*SameSite=/i.test(rewritten)) {
    rewritten += '; SameSite=Lax';
  }

  if (!/;\s*Path=/i.test(rewritten)) {
    rewritten += '; Path=/';
  }

  return rewritten;
}

export function collectSetCookies(response: Response): string[] {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get('set-cookie');
  if (!single) return [];

  return single.split(/,(?=\s*[\w-]+=)/).map((part) => part.trim());
}

export function buildProxyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (STRIP_REQUEST_HEADERS.has(lower)) return;
    headers.set(key, value);
  });
  return headers;
}

function copyBackendHeaders(response: Response, responseHeaders: Headers): void {
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || STRIP_RESPONSE_HEADERS.has(lower)) return;
    responseHeaders.set(key, value);
  });
}

export function isSseProxyPath(path: string): boolean {
  return path === 'components/stream' || path.endsWith('/components/stream');
}

/** Proxy SSE con streaming (no bufferizar). Cierra el upstream si el cliente aborta. */
export async function proxySseRequest(
  request: NextRequest,
  targetUrl: string,
  headers: Headers,
): Promise<NextResponse> {
  if (!headers.has('accept')) {
    headers.set('Accept', 'text/event-stream');
  }

  const backendResponse = await fetch(targetUrl, {
    method: 'GET',
    headers,
    redirect: 'manual',
    signal: request.signal,
  });

  const responseHeaders = new Headers();
  copyBackendHeaders(backendResponse, responseHeaders);

  for (const cookie of collectSetCookies(backendResponse)) {
    responseHeaders.append('set-cookie', rewriteSetCookie(cookie));
  }

  responseHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-cache, no-transform');
  responseHeaders.set('Connection', 'keep-alive');
  responseHeaders.set('X-Accel-Buffering', 'no');

  if (!backendResponse.ok) {
    const errorBody = await backendResponse.text();
    return new NextResponse(errorBody || null, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  }

  if (!backendResponse.body) {
    return new NextResponse(null, {
      status: 502,
      statusText: 'Bad Gateway',
      headers: responseHeaders,
    });
  }

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}
