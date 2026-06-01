import { NextRequest } from 'next/server';
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
  return proxySseRequest(request, targetUrl, headers);
}
