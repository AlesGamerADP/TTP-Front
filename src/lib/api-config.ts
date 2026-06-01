export function normalizeApiBaseUrl(url: string): string {
  if (!url) return '';
  return url === '/' ? '' : url.replace(/\/+$/, '');
}

export function shouldUseSameOriginApi(): boolean {
  if (process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === 'true') return true;
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  return !publicUrl;
}

/** API del navegador pasa por rewrites de Next (`/api` → backend). */
export function isBrowserApiProxied(): boolean {
  return typeof window !== 'undefined' && shouldUseSameOriginApi();
}

export function getApiProxyTarget(): string {
  const internalUrl = normalizeApiBaseUrl(process.env.INTERNAL_API_URL || '');
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  return internalUrl || publicUrl;
}

/** URL absoluta para fetch / img / iframe (usa el mismo origen si el API va por proxy). */
export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = normalizeApiBaseUrl(
    typeof window === 'undefined'
      ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''
      : process.env.NEXT_PUBLIC_API_URL || '',
  );

  if (base) {
    return `${base}${normalizedPath}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalizedPath}`;
  }

  return normalizedPath;
}
