export type ApiErrorLike = Error & {
  status?: number;
  code?: string;
};

export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const apiError = error as ApiErrorLike;
  const status = apiError.status;
  if (status === 401 || status === 403) return true;

  const code = apiError.code?.toUpperCase() ?? '';
  if (
    code === 'TOKEN_EXPIRED' ||
    code === 'INVALID_SIGNATURE' ||
    code === 'MISSING_TOKEN' ||
    code === 'UNAUTHORIZED'
  ) {
    return true;
  }

  const message = apiError.message?.toLowerCase() ?? '';
  return (
    message.includes('no autenticado') ||
    message.includes('missing token') ||
    message.includes('session expired') ||
    message.includes('sesión expirada') ||
    message.includes('token inválido') ||
    message.includes('401')
  );
}

export function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const apiError = error as Error;
  const message = apiError.message?.toLowerCase() ?? '';

  return (
    message.includes('no se pudo conectar') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('networkerror') ||
    message.includes('error de conexión') ||
    message.includes('tardó demasiado') ||
    apiError.name === 'TypeError' ||
    apiError.name === 'AbortError'
  );
}
