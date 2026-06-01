/** Access token en memoria + sessionStorage (login/refresh del backend). */
let memoryAccessToken: string | null = null;

const STORAGE_KEY = 'ttp_access';

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token?.trim() || null;
  if (typeof window === 'undefined') return;
  try {
    if (memoryAccessToken) {
      sessionStorage.setItem(STORAGE_KEY, memoryAccessToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* Safari privado / WebView */
  }
}

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function appendAccessTokenToUrl(url: string): string {
  const token = getAccessToken();
  if (!token) return url;
  if (!url.includes('/api/components/_photos/') && !url.includes('/_docs/')) {
    return url;
  }
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('accessToken', token);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}accessToken=${encodeURIComponent(token)}`;
  }
}
