/** Utilidades de configuración de API (seguras para Server Components). */

export function normalizeApiBaseUrl(url: string): string {
  if (!url) return '';
  return url === '/' ? '' : url.replace(/\/+$/, '');
}

/**
 * El navegador llama a `/api/*` en el mismo dominio (proxy en app/api/[...path]).
 * Evita cookies cross-site bloqueadas en Safari, iOS y WebViews.
 */
export function usesBrowserApiProxy(): boolean {
  if (process.env.NEXT_PUBLIC_API_PROXY === 'true') {
    return true;
  }

  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  return !publicUrl || publicUrl === '/';
}
