export function normalizeApiBaseUrl(url: string): string {
  if (!url) return '';
  return url === '/' ? '' : url.replace(/\/+$/, '');
}

export function shouldUseSameOriginApi(): boolean {
  if (process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === 'true') return true;
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  return !publicUrl;
}

export function getApiProxyTarget(): string {
  const internalUrl = normalizeApiBaseUrl(process.env.INTERNAL_API_URL || '');
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  return internalUrl || publicUrl;
}
