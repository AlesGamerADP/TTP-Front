import { apiClient, API_BASE_URL, authApi } from './api';

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

type ApiErrorBody = { error?: string; message?: string; code?: string; details?: { message?: string }[] };

function parseXhrError(xhr: XMLHttpRequest): Error {
  try {
    const err = JSON.parse(xhr.responseText) as ApiErrorBody;
    const details = Array.isArray(err.details) ? err.details.map((d) => d.message).filter(Boolean) : [];
    const base = err.error || err.message || `HTTP ${xhr.status}`;
    const msg = details.length ? `${base}: ${details.join(', ')}` : base;
    const error = new Error(msg) as Error & { status?: number; code?: string };
    error.status = xhr.status;
    error.code = err.code;
    return error;
  } catch {
    return new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
  }
}

async function sendOnce<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = await apiClient.buildMutatingHeaders();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== 'content-type') {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      });
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          reject(new Error('Respuesta inválida del servidor'));
        }
        return;
      }
      reject(parseXhrError(xhr));
    });

    xhr.addEventListener('error', () => reject(new Error('Error de red al subir archivos')));
    xhr.addEventListener('abort', () => reject(new Error('Subida cancelada')));

    xhr.send(formData);
  });
}

export async function postFormDataWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> {
  try {
    return await sendOnce<T>(endpoint, formData, onProgress);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'TOKEN_EXPIRED' || code === 'CSRF_MISSING' || code === 'CSRF_INVALID') {
      if (code === 'CSRF_MISSING' || code === 'CSRF_INVALID') {
        await apiClient.syncCsrfToken(true);
      } else {
        await authApi.refresh();
      }
      return sendOnce<T>(endpoint, formData, onProgress);
    }
    throw error;
  }
}
