import { appendAccessTokenToUrl, getAccessToken } from './auth-token';
import { resolveApiUrl } from './api-config';
import { logger } from './logger';

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

  const response = await fetch(fetchUrl, {
    method: 'GET',
    credentials: 'include',
    mode: 'cors',
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

/** URL lista para <img> o fetch según origen (Cloudinary, API propia, etc.). */
export async function resolvePhotoPreviewUrl(photoPath: string): Promise<string> {
  const { componentsApi } = await import('./api');
  const url = componentsApi.getPhotoUrl(photoPath, { size: 'full' });
  if (!url) {
    throw new Error('Ruta de foto vacía');
  }

  if (isSameOriginMediaUrl(url)) {
    return appendAccessTokenToUrl(url);
  }

  const blob = await fetchAuthenticatedBlob(url, 'image/*');
  return URL.createObjectURL(blob);
}

/** URL lista para visor PDF (<iframe> / <object>). */
export async function resolvePdfPreviewUrl(docId: string): Promise<string> {
  const directUrl = getDocumentDownloadUrl(docId);

  if (isSameOriginMediaUrl(directUrl)) {
    return appendAccessTokenToUrl(directUrl);
  }

  const blob = await fetchAuthenticatedBlob(directUrl, 'application/pdf');
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
