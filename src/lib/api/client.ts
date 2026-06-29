import { logger } from '../logger';
import { API_BASE_URL } from './base-url';

type ApiValidationDetail = {
  path?: string;
  message?: string;
};

export class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;
  private connectionErrorCount: number = 0;
  private lastConnectionError: number = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly CONNECTION_ERROR_RESET_TIME = 10000; // 10 segundos

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setCsrfToken(token: string | null) {
    this.csrfToken = token;
  }

  /** Obtiene o renueva el token CSRF (p. ej. tras error CSRF_INVALID). */
  async syncCsrfToken(force = false): Promise<void> {
    if (force) this.csrfToken = null;
    await this.ensureCsrfToken();
  }

  private async ensureCsrfToken(): Promise<void> {
    if (this.csrfToken) return;
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = (await response.json()) as { csrfToken?: string };
        if (data.csrfToken) {
          this.csrfToken = data.csrfToken;
        }
      }
    } catch (error) {
      logger.warn('No se pudo obtener token CSRF', { error });
    }
  }

  private isMutatingMethod(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  async buildMutatingHeaders(contentType?: string): Promise<Record<string, string>> {
    await this.ensureCsrfToken();
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }
    return headers;
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        // El refresh token está en cookies, se envía automáticamente
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = (await response.json()) as { csrfToken?: string };
        if (data.csrfToken) {
          this.csrfToken = data.csrfToken;
        }
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.isMutatingMethod(method)) {
      await this.ensureCsrfToken();
      if (this.csrfToken) {
        (headers as Record<string, string>)['X-CSRF-Token'] = this.csrfToken;
      }
    }

    // Si hay muchos errores de conexión consecutivos, esperar antes de intentar
    const now = Date.now();
    if (this.connectionErrorCount >= this.MAX_CONSECUTIVE_ERRORS) {
      const timeSinceLastError = now - this.lastConnectionError;
      if (timeSinceLastError < this.CONNECTION_ERROR_RESET_TIME) {
        const waitTime = this.CONNECTION_ERROR_RESET_TIME - timeSinceLastError;
        logger.warn('Demasiados errores de conexión, esperando antes de reintentar', {
          waitTime,
          errorCount: this.connectionErrorCount,
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Resetear contador si pasó suficiente tiempo
        this.connectionErrorCount = 0;
      }
    }

    try {
      // Agregar timeout a la request (30 segundos)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Incluir cookies en todas las peticiones
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Si la request fue exitosa, resetear contador de errores
      if (response.ok) {
        this.connectionErrorCount = 0;
      }

      const status = response.status;
      const statusText = response.statusText;
      const ok = response.ok;

      logger.debug('API Response', {
        status,
        statusText,
        url,
        ok,
      });

      if (!ok) {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        let responseText = '';

        try {
          responseText = await response.text();
          logger.debug('Error response text', {
            preview: responseText.substring(0, 200),
            url,
          });

          if (contentType && contentType.includes('application/json')) {
            try {
              errorData = JSON.parse(responseText);
              logger.debug('Parsed error data', { errorData, url });
            } catch (parseError) {
              logger.error('Error parsing JSON response', { error: parseError, url });
              errorData = { error: responseText || `HTTP ${status}: ${statusText}` };
            }
          } else {
            errorData = { error: responseText || `HTTP ${status}: ${statusText}` };
          }
        } catch (parseError: any) {
          logger.error('Error reading error response', {
            message: parseError?.message,
            name: parseError?.name,
            url,
          });
          errorData = { error: `HTTP ${status}: ${statusText}` };
        }

        // Si el token tiene firma inválida, redirigir a login
        if (status === 401 && errorData?.code === 'INVALID_SIGNATURE') {
          if (typeof window !== 'undefined') {
            const { clearAllStorage } = await import('../storage');
            clearAllStorage();
            window.location.href = '/login';
          }
          const signError = new Error('Token inválido. Por favor, vuelve a iniciar sesión.');
          (signError as any).status = 401;
          throw signError;
        }

        // Si el token expiró, intentar refrescarlo
        if (status === 401 && errorData?.code === 'TOKEN_EXPIRED') {
          try {
            await this.refreshAccessToken();
            // Reintentar la request original (las cookies se envían automáticamente)
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });

            if (retryResponse.ok) {
              const retryContentType = retryResponse.headers.get('content-type');
              if (!retryContentType || !retryContentType.includes('application/json')) {
                const text = await retryResponse.text();
                return { data: text } as T;
              }
              return await retryResponse.json() as T;
            }
          } catch (refreshError) {
            // Si el refresh falla, redirigir a login
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            const expiredErr = new Error('Session expired. Please login again.');
            (expiredErr as any).status = 401;
            throw expiredErr;
          }
        }

        const errorMessage = errorData.error || errorData.message || `HTTP ${status}: ${statusText}`;
        const validationDetails = Array.isArray(errorData?.details)
          ? (errorData.details as ApiValidationDetail[])
          : [];
        const detailedErrorMessage =
          validationDetails.length > 0
            ? `${errorMessage}: ${validationDetails
                .map((detail) => detail.message || detail.path || 'Dato inválido')
                .join(', ')}`
            : errorMessage;

        // Manejo especial para rate limiting (429)
        if (status === 429) {
          const rateLimitMessage = errorData.message || errorMessage;
          logger.warn('Rate limit alcanzado', {
            url,
            message: rateLimitMessage,
            retryAfter: response.headers.get('Retry-After'),
          });
          const rateError = new Error(rateLimitMessage);
          (rateError as any).status = 429;
          throw rateError;
        }

        // Manejo especial para 401 - Missing token o token inválido
        if (status === 401) {
          logger.warn('Request no autorizado', {
            url,
            errorMessage,
            errorCode: errorData?.code,
          });

          // Si es TOKEN_EXPIRED, intentar refrescar el token
          if (errorData?.code === 'TOKEN_EXPIRED') {
            try {
              await this.refreshAccessToken();
              // Reintentar la request original después de refrescar
              logger.info('Token refrescado, reintentando request', { url });
              return this.request<T>(endpoint, options);
            } catch (refreshError) {
              logger.error('Error al refrescar token', { error: refreshError });
              // Si el refresh falla, limpiar storage y redirigir a login
              if (typeof window !== 'undefined') {
                const { clearAllStorage } = await import('../storage');
                clearAllStorage();
                window.location.href = '/login';
              }
              const refreshErr = new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
              (refreshErr as any).status = 401;
              throw refreshErr;
            }
          }

          // Si no es un error de token expirado o firma inválida,
          // y es "Missing token", solo lanzar error sin redirigir automáticamente
          // El componente que llama puede decidir qué hacer
          if (errorData?.code !== 'INVALID_SIGNATURE') {
            // No redirigir automáticamente - dejar que el componente maneje el error
            const authError = new Error('No autenticado. Por favor, inicia sesión.');
            (authError as Error & { status?: number; code?: string }).status = 401;
            (authError as Error & { status?: number; code?: string }).code = errorData?.code;
            throw authError;
          }
        }

        // Log del error
        logger.error('Request failed', {
          status,
          statusText,
          url,
          method: options.method || 'GET',
          errorMessage,
          errorCode: errorData?.code,
        });

        const requestError = new Error(detailedErrorMessage);
        (requestError as Error & { status?: number; code?: string; details?: ApiValidationDetail[] }).status =
          status;
        (requestError as Error & { status?: number; code?: string; details?: ApiValidationDetail[] }).code =
          errorData?.code;
        (requestError as Error & { status?: number; code?: string; details?: ApiValidationDetail[] }).details =
          validationDetails;

        throw requestError;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        logger.warn('Non-JSON response', { contentType, url });
        return { data: text } as T;
      }

      const jsonData = await response.json();
      logger.debug('Response data received', { url, hasData: !!jsonData });
      return jsonData;
    } catch (error) {
      // Si el error tiene una propiedad status, es un error HTTP que ya procesamos
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Capturar información detallada del error
      let errorMessage = 'Unknown error';
      let errorName = 'UnknownError';
      let errorDetails: any = null;

      if (error instanceof Error) {
        errorMessage = error.message || 'Unknown error';
        errorName = error.name || 'Error';
        errorDetails = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          cause: (error as any).cause
        };
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
          errorDetails = error;
        } catch {
          errorMessage = String(error);
          errorDetails = { raw: error };
        }
      } else {
        errorMessage = String(error);
        errorDetails = { raw: error };
      }

      // Detectar errores de conexión ANTES de loguear
      const isConnectionError = error instanceof Error && (
        error.message === 'Failed to fetch' ||
        error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        error.name === 'AbortError' ||
        error.message.includes('network') ||
        error.message.includes('NetworkError')
      );

      if (isConnectionError) {
        this.connectionErrorCount++;
        this.lastConnectionError = Date.now();

        // Solo loguear el primer error de conexión para evitar spam
        if (this.connectionErrorCount === 1) {
          logger.error('Error de conexión con el servidor', {
            url,
            baseUrl: this.baseUrl,
            errorMessage: error instanceof Error ? error.message : errorMessage,
            errorName: error instanceof Error ? error.name : errorName,
          });
        } else {
          // Para errores subsecuentes, solo loguear en debug
          logger.debug('Error de conexión (subsecuente)', {
            url,
            errorCount: this.connectionErrorCount,
          });
        }

        // Si es un error de aborto (timeout), mensaje específico
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('La solicitud tardó demasiado. El servidor puede estar sobrecargado.');
        }

        // Solo mostrar mensaje detallado en el primer error
        if (this.connectionErrorCount === 1) {
          throw new Error(`No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${this.baseUrl}`);
        } else {
          // Para errores subsecuentes, mensaje más corto
          throw new Error('Error de conexión con el servidor');
        }
      }

      // Para errores no de conexión, loguear normalmente
      logger.error('API Error', {
        url,
        errorMessage,
        errorName,
        baseUrl: this.baseUrl,
        errorType: typeof error,
        isError: error instanceof Error,
      });

      if (error instanceof Error) {
        // Si el error no tiene mensaje, intentar obtener más información
        if (!error.message || error.message === '') {
          throw new Error('Error de conexión con el servidor');
        }
        throw error;
      }

      // Si no es un Error estándar, crear uno con la información disponible
      throw new Error(`Network error: ${errorMessage}`);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.buildMutatingHeaders();

    try {
      logger.debug('FormData request', { method: 'POST', url });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      logger.debug('FormData response', { status: response.status, statusText: response.statusText, url });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));

        if (response.status === 401 && errorData?.code === 'TOKEN_EXPIRED') {
          await this.refreshAccessToken();
          return this.postFormData<T>(endpoint, formData);
        }

        if (
          response.status === 403 &&
          (errorData?.code === 'CSRF_MISSING' || errorData?.code === 'CSRF_INVALID')
        ) {
          await this.syncCsrfToken(true);
          return this.postFormData<T>(endpoint, formData);
        }

        if (response.status === 401 && errorData?.code === 'INVALID_SIGNATURE') {
          if (typeof window !== 'undefined') {
            const { clearAllStorage } = await import('../storage');
            clearAllStorage();
            window.location.href = '/login';
          }
        }

        const validationDetails = Array.isArray(errorData?.details) ? errorData.details : [];
        const baseMsg = errorData.error || errorData.message || `HTTP ${response.status}`;
        const errorMessage =
          validationDetails.length > 0
            ? `${baseMsg}: ${validationDetails.map((d: { message?: string }) => d.message).join(', ')}`
            : baseMsg;
        const err = new Error(errorMessage) as Error & { status?: number; code?: string };
        err.status = response.status;
        err.code = errorData?.code;
        throw err;
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      logger.error('FormData Error', {
        url,
        errorMessage,
        errorName,
        baseUrl: this.baseUrl,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });

      if (error instanceof Error) {
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
          throw new Error(`No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${this.baseUrl}`);
        }
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
