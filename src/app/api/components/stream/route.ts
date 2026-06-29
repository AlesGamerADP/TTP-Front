import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_BASE,
  buildProxyRequestHeaders,
  proxySseRequest,
} from '@/lib/api-proxy';

/**
 * Ruta dedicada para SSE (no usar el catch-all bufferizado).
 * En Vercel Pro, maxDuration alarga la conexión; al cortarse, EventSource reconecta.
 * El polling por visibilidad sigue como respaldo.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const targetUrl = `${BACKEND_BASE}/api/components/stream${request.nextUrl.search}`;
  const headers = buildProxyRequestHeaders(request);
  try {
    return await proxySseRequest(request, targetUrl, headers);
  } catch (err: any) {
    console.error(`Proxy SSE error connecting to ${targetUrl}:`, err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Proxy SSE Error',
        message: err.message || String(err),
        targetUrl,
        backendBase: BACKEND_BASE,
      },
      { status: 502 }
    );
  }
}
