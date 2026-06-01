import { appendAccessTokenToUrl, getAccessToken } from './auth-token';
import { resolveApiUrl } from './api-config';

export type FetchMediaOptions = RequestInit & {
  /** Si true, añade accessToken en query cuando exista (fotos/docs). */
  withQueryToken?: boolean;
};

/**
 * Descarga binaria autenticada (fotos, PDFs).
 * Usa cookies same-origin y/o Bearer / ?accessToken= según FRONTEND_AUTH.md.
 */
export async function fetchAuthenticatedMedia(
  pathOrUrl: string,
  options: FetchMediaOptions = {},
): Promise<Response> {
  const { withQueryToken = true, ...init } = options;

  let url = resolveApiUrl(pathOrUrl);
  if (withQueryToken) {
    url = appendAccessTokenToUrl(url);
  }

  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', '*/*');
  }

  return fetch(url, {
    ...init,
    method: init.method ?? 'GET',
    credentials: init.credentials ?? 'include',
    headers,
  });
}

export async function fetchAuthenticatedBlob(
  pathOrUrl: string,
  options?: FetchMediaOptions,
): Promise<Blob> {
  const response = await fetchAuthenticatedMedia(pathOrUrl, options);
  if (!response.ok) {
    throw new Error(`Media fetch failed: HTTP ${response.status}`);
  }
  return response.blob();
}

/** URL resuelta para src/href (con token en query si aplica). */
export function resolveAuthenticatedMediaUrl(pathOrUrl: string): string {
  return appendAccessTokenToUrl(resolveApiUrl(pathOrUrl));
}
