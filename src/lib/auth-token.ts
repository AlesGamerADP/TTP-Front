const ACCESS_TOKEN_SESSION_KEY = 'ttp_access';

let memoryAccessToken: string | null = null;

/** Access token en memoria (preferido) o sessionStorage (respaldo tras F5). */
export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;

  if (typeof window === 'undefined') return null;

  try {
    return sessionStorage.getItem(ACCESS_TOKEN_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;

  if (typeof window === 'undefined') return;

  try {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_SESSION_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_SESSION_KEY);
    }
  } catch {
    // Modo privado / WebView sin sessionStorage
  }
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

/** Para `<img src>` cuando no hay header Authorization (GET /_photos, /_docs/.../download). */
export function appendAccessTokenToUrl(url: string): string {
  const token = getAccessToken();
  if (!token) return url;

  try {
    const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
    const parsed = new URL(url, isAbsolute ? undefined : 'http://local.invalid');
    if (parsed.searchParams.has('accessToken') || parsed.searchParams.has('token')) {
      return url;
    }
    parsed.searchParams.set('accessToken', token);
    if (isAbsolute) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}accessToken=${encodeURIComponent(token)}`;
  }
}
