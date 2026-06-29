type ApiErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  name?: string;
};

export function getApiErrorMeta(error: unknown): ApiErrorLike {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const record = error as ApiErrorLike;
  return {
    status: record.status,
    code: record.code,
    message: record.message || String(error),
    name: record.name,
  };
}

export function isUnauthorizedApiError(error: unknown): boolean {
  const { status, code, message } = getApiErrorMeta(error);
  if (status === 401) return true;
  if (
    code === 'TOKEN_EXPIRED' ||
    code === 'INVALID_SIGNATURE' ||
    code === 'SESSION_REVOKED' ||
    code === 'INVALID_TOKEN' ||
    code === 'UNAUTHORIZED'
  ) {
    return true;
  }

  const normalized = (message || '').toLowerCase();
  return (
    normalized.includes('no autenticado') ||
    normalized.includes('missing token') ||
    normalized.includes('session expired') ||
    normalized.includes('sesión expirada') ||
    normalized.includes('inicia sesión')
  );
}

export function isConnectionApiError(error: unknown): boolean {
  const { message, name } = getApiErrorMeta(error);
  const normalized = message || '';
  return (
    name === 'TypeError' ||
    name === 'AbortError' ||
    normalized.includes('No se pudo conectar') ||
    normalized.includes('Failed to fetch') ||
    normalized.includes('NetworkError') ||
    normalized.includes('Load failed')
  );
}

export function isForbiddenApiError(error: unknown): boolean {
  const { status, code } = getApiErrorMeta(error);
  if (status === 403) return true;
  return code === 'CSRF_MISSING' || code === 'CSRF_INVALID' || code === 'FORBIDDEN';
}

export function isCsrfApiError(error: unknown): boolean {
  const { code } = getApiErrorMeta(error);
  return code === 'CSRF_MISSING' || code === 'CSRF_INVALID';
}

export function isTransientApiError(error: unknown): boolean {
  return isUnauthorizedApiError(error) || isConnectionApiError(error);
}

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
