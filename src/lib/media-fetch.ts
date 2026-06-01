import { appendAccessTokenToUrl, getAccessToken } from './auth-token';
import { isBrowserApiProxied, resolveApiUrl } from './api-config';
import { logger } from './logger';

const PHOTO_API_PATH = '/api/components/_photos/';

async function ensureAccessTokenForMedia(): Promise<void> {
  if (getAccessToken()) return;
  try {
    const { authApi } = await import('./api');
    await authApi.refresh();
  } catch {
    logger.debug('No se pudo obtener accessToken para medios (puede usar cookies same-origin)');
  }
}

export function isSameOriginMediaUrl(url: string): boolean {
  if (typeof window === 'undefined') return true;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return true;
  }
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function getDocumentDownloadUrl(docId: string): string {
  return resolveApiUrl(`/api/components/_docs/${docId}/download`);
}

function buildMediaAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: '*/*',
  };
  const token = getAccessToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchAuthenticatedBlob(
  url: string,
  expectedType?: string,
): Promise<Blob> {
  const resolved = url.startsWith('http') ? url : resolveApiUrl(url);
  const fetchUrl = appendAccessTokenToUrl(resolved);
  const headers = buildMediaAuthHeaders();
  if (expectedType) {
    (headers as Record<string, string>)['Accept'] = `${expectedType}, */*`;
  }
  if (isBrowserApiProxied() && isSameOriginMediaUrl(resolved)) {
    (headers as Record<string, string>)['Accept-Encoding'] = 'identity';
  }

  const sameOrigin = isSameOriginMediaUrl(resolved);
  const response = await fetch(fetchUrl, {
    method: 'GET',
    credentials: 'include',
    mode: sameOrigin ? 'same-origin' : 'cors',
    headers,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      message = data.error || data.message || message;
    }
    throw new Error(message);
  }

  const contentType =
    response.headers.get('content-type')?.split(';')[0]?.trim() ||
    expectedType ||
    'application/octet-stream';
  const blob = await response.blob();

  if (blob.type && blob.type !== 'application/octet-stream') {
    return blob;
  }

  return new Blob([await blob.arrayBuffer()], { type: contentType });
}

/**
 * URL para <img>: la API propia admite ?accessToken= (sin preflight CORS).
 * El fetch+blob solo se usa como respaldo o para URLs externas sin token.
 */
export async function resolvePhotoPreviewUrl(photoPath: string): Promise<string> {
  const { componentsApi } = await import('./api');
  const url = componentsApi.getPhotoUrl(photoPath, { size: 'full' });
  if (!url) {
    throw new Error('Ruta de foto vacía');
  }

  const isApiPhoto = url.includes(PHOTO_API_PATH);
  const isPublicCdn =
    (url.startsWith('https://') || url.startsWith('http://')) && !isApiPhoto;

  if (isPublicCdn) {
    return url;
  }

  if (isApiPhoto || url.includes('/api/components/_docs/')) {
    await ensureAccessTokenForMedia();
    const authedUrl = appendAccessTokenToUrl(url);
    // CSP img-src solo permite 'self' en el mismo puerto; en dev (3000→4000) usar blob:
    if (!isSameOriginMediaUrl(authedUrl)) {
      const blob = await fetchAuthenticatedBlob(authedUrl, 'image/*');
      return URL.createObjectURL(blob);
    }
    return authedUrl;
  }

  if (isSameOriginMediaUrl(url)) {
    return appendAccessTokenToUrl(url);
  }

  const blob = await fetchAuthenticatedBlob(url, 'image/*');
  return URL.createObjectURL(blob);
}

/** Carga la foto vía fetch (cookies / CORS) si falla el <img> directo. */
export async function fetchPhotoPreviewBlobUrl(photoUrl: string): Promise<string> {
  const blob = await fetchAuthenticatedBlob(photoUrl, 'image/*');
  return URL.createObjectURL(blob);
}

/** URL para visor PDF (<iframe> / <object>). Usa blob si el API es otro origen (CSP frame-src). */
export async function resolvePdfPreviewUrl(docId: string): Promise<string> {
  await ensureAccessTokenForMedia();
  const authedUrl = appendAccessTokenToUrl(getDocumentDownloadUrl(docId));
  if (isSameOriginMediaUrl(authedUrl)) {
    return authedUrl;
  }
  const blob = await fetchAuthenticatedBlob(authedUrl, 'application/pdf');
  return URL.createObjectURL(blob);
}

export function revokeBlobUrlIfNeeded(url: string | null): void {
  if (!url?.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.debug('No se pudo revocar blob URL', { error });
  }
}
