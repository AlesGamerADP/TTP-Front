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

function getServerApiBaseUrl(): string {
  const internal = normalizeApiBaseUrl(process.env.INTERNAL_API_URL || '');
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (internal) return internal;
  if (publicUrl && publicUrl !== '/') return publicUrl;
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return '';
}

function getBrowserApiBaseUrl(): string {
  if (usesBrowserApiProxy()) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (publicUrl && publicUrl !== '/') {
    return publicUrl;
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Convierte `/api/...` o URL absoluta del backend en URL lista para fetch/img.
 * Seguro para Server Components (no importa ApiClient).
 */
export function resolveApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl?.trim()) return '';

  const trimmed = pathOrUrl.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/api/')) {
        const relative = `${parsed.pathname}${parsed.search}`;
        const base =
          typeof window !== 'undefined' ? getBrowserApiBaseUrl() : getServerApiBaseUrl();
        return base ? `${base}${relative}` : relative;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (!trimmed.startsWith('/api/')) {
    return trimmed;
  }

  const base =
    typeof window !== 'undefined' ? getBrowserApiBaseUrl() : getServerApiBaseUrl();
  return base ? `${base}${trimmed}` : trimmed;
}
