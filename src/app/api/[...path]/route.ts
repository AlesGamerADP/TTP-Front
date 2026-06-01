import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_BASE,
  buildProxyRequestHeaders,
  collectSetCookies,
  isSseProxyPath,
  proxySseRequest,
  rewriteSetCookie,
  STRIP_RESPONSE_HEADERS,
} from '@/lib/api-proxy';

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const targetUrl = `${BACKEND_BASE}/api/${path}${request.nextUrl.search}`;

  const headers = buildProxyRequestHeaders(request);
  const method = request.method.toUpperCase();

  if (method === 'GET' && isSseProxyPath(path)) {
    return proxySseRequest(request, targetUrl, headers);
  }

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

  if (
    request.nextUrl.searchParams.get('inline') === '1' &&
    /\/components\/_docs\/[^/]+\/download$/i.test(`/api/${path}`)
  ) {
    const disposition = responseHeaders.get('content-disposition');
    if (disposition) {
      responseHeaders.set(
        'content-disposition',
        disposition.replace(/\battachment\b/i, 'inline'),
      );
    } else {
      responseHeaders.set('content-disposition', 'inline');
    }

    const contentType = responseHeaders.get('content-type');
    if (!contentType || contentType === 'application/octet-stream') {
      responseHeaders.set('content-type', 'application/pdf');
    }
  }

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
