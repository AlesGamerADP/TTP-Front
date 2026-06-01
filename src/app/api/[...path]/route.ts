import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE = (
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
const STRIP_RESPONSE_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'content-encoding',
  'content-length',
]);

/** Pedir respuesta sin comprimir al backend para evitar doble codificación en el proxy. */
const STRIP_REQUEST_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  'host',
  'accept-encoding',
]);

/**
 * Reescribe cookies del backend (otro dominio) para que el navegador las guarde
 * en el dominio del frontend (Vercel). Necesario para Safari, iOS y WebViews.
 */
function rewriteSetCookie(cookie: string): string {
  let rewritten = cookie.replace(/;\s*Domain=[^;]*/gi, '');

  // En local http, Secure impide que el navegador guarde la cookie.
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

function collectSetCookies(response: Response): string[] {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get('set-cookie');
  if (!single) return [];

  return single.split(/,(?=\s*[\w-]+=)/).map((part) => part.trim());
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const targetUrl = `${BACKEND_BASE}/api/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (STRIP_REQUEST_HEADERS.has(lower)) return;
    headers.set(key, value);
  });

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const backendResponse = await fetch(targetUrl, init);
  const responseHeaders = new Headers();

  backendResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || STRIP_RESPONSE_HEADERS.has(lower)) return;
    responseHeaders.set(key, value);
  });

  for (const cookie of collectSetCookies(backendResponse)) {
    responseHeaders.append('set-cookie', rewriteSetCookie(cookie));
  }

  // Cuerpo ya descomprimido por fetch de Node; no reenviar Content-Encoding del backend.
  const body = await backendResponse.arrayBuffer();

  return new NextResponse(body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
