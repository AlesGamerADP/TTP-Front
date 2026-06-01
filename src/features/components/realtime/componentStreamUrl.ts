import { usesBrowserApiProxy } from '@/lib/api-config';

/**
 * URL del stream SSE.
 * Con `NEXT_PUBLIC_API_PROXY=true` las cookies de sesión están en el dominio del front:
 * el stream debe ser same-origin (`/api/components/stream`), no al backend directo.
 */
export function getComponentStreamUrl(): string {
  if (typeof window === 'undefined') {
    return '/api/components/stream';
  }

  if (usesBrowserApiProxy()) {
    return `${window.location.origin}/api/components/stream`;
  }

  const publicUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  if (publicUrl && publicUrl !== '/') {
    return `${publicUrl}/api/components/stream`;
  }

  return `${window.location.origin}/api/components/stream`;
}
