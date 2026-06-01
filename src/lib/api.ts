// API service para conectar con el backend
import { appendAccessTokenToUrl } from './auth-token';
import { logger } from './logger';

import {
  getApiProxyTarget,
  normalizeApiBaseUrl,
  resolveApiUrl,
  shouldUseSameOriginApi,
} from './api-config';

export {
  getApiProxyTarget,
  normalizeApiBaseUrl,
  resolveApiUrl,
  shouldUseSameOriginApi,
} from './api-config';

// En AWS el navegador debe hablar con la misma origin pública (`/api`) y el SSR puede usar
// una URL privada interna (`INTERNAL_API_URL`) para evitar salir por internet.
const getApiBaseUrl = (): string => {
  const isServer = typeof window === 'undefined';
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  const internalUrl = normalizeApiBaseUrl(process.env.INTERNAL_API_URL || '');

  if (isServer) {
    if (internalUrl) return internalUrl;
    if (publicUrl) return publicUrl;

    if (process.env.NODE_ENV === 'development') {
      logger.warn('INTERNAL_API_URL no está configurada, usando localhost:4000 como fallback para SSR');
      return 'http://localhost:4000';
    }

    throw new Error('Configura INTERNAL_API_URL o NEXT_PUBLIC_API_URL para el runtime del servidor.');
  }

  // Safari iOS bloquea cookies en fetch cross-site (front Vercel → API Render).
  if (shouldUseSameOriginApi()) {
    return '';
  }

  if (publicUrl) {
    return publicUrl;
  }

  if (process.env.NODE_ENV === 'development') {
    logger.warn('NEXT_PUBLIC_API_URL no está configurada, usando localhost:4000 como fallback');
    return 'http://localhost:4000';
  }

  return '';
};

export const API_BASE_URL = getApiBaseUrl();

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const publicUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (publicUrl && !shouldUseSameOriginApi()) {
    logger.warn(
      'API cross-origin en producción: Safari/Firefox móvil pueden bloquear cookies. ' +
        'Configura NEXT_PUBLIC_USE_SAME_ORIGIN_API=true e INTERNAL_API_URL en Vercel.',
      { publicUrl },
    );
  }
}

export interface ApiError {
  error: string;
  message?: string;
}

type ApiValidationDetail = {
  path?: string;
  message?: string;
};

class ApiClient {
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
            const { clearAllStorage } = await import('./storage');
            clearAllStorage();
            window.location.href = '/login';
          }
          throw new Error('Token inválido. Por favor, vuelve a iniciar sesión.');
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
              const contentType = retryResponse.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
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
            throw new Error('Session expired. Please login again.');
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
          throw new Error(rateLimitMessage);
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
                const { clearAllStorage } = await import('./storage');
                clearAllStorage();
                window.location.href = '/login';
              }
              throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }
          }
          
          // Si no es un error de token expirado o firma inválida, 
          // y es "Missing token", solo lanzar error sin redirigir automáticamente
          // El componente que llama puede decidir qué hacer
          if (errorData?.code !== 'INVALID_SIGNATURE') {
            // No redirigir automáticamente - dejar que el componente maneje el error
            throw new Error('No autenticado. Por favor, inicia sesión.');
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
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
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

// Auth endpoints
export const authApi = {
  login: async (codigo: string, password: string) => {
    const response = await apiClient.post<{
      user: any;
      csrfToken?: string;
      accessToken?: string;
      refreshToken?: string;
    }>('/api/auth/login', { codigo, password });
    if (response.csrfToken) {
      apiClient.setCsrfToken(response.csrfToken);
    }
    if (response.accessToken) {
      const { setAccessToken } = await import('./auth-token');
      setAccessToken(response.accessToken);
    }
    return response;
  },
  refresh: async () => {
    const response = await apiClient.post<{
      success: boolean;
      csrfToken?: string;
      accessToken?: string;
      refreshToken?: string;
    }>('/api/auth/refresh', {});
    if (response.csrfToken) {
      apiClient.setCsrfToken(response.csrfToken);
    }
    if (response.accessToken) {
      const { setAccessToken } = await import('./auth-token');
      setAccessToken(response.accessToken);
    }
    return response;
  },
  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (error) {
      logger.error('Error during logout', { error });
    }
    const { setAccessToken } = await import('./auth-token');
    setAccessToken(null);
  },
};

// Users endpoints
export const usersApi = {
  getMe: () => apiClient.get<{ data: any }>('/api/users/me'),
  getAll: () => apiClient.get<{ data: any[] }>('/api/users'),
  create: (userData: any) => apiClient.post<{ data: any }>('/api/users', userData),
  update: (id: string, userData: any) =>
    apiClient.patch<{ data: any }>(`/api/users/${id}`, userData),
  delete: (id: string) => apiClient.delete(`/api/users/${id}`),
      sendCredentials: async (id: string, password: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
          const headers = await apiClient.buildMutatingHeaders('application/json');
          const response = await fetch(`${API_BASE_URL}/api/users/${id}/send-credentials`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ password }),
            credentials: 'include',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
          }
          
          return await response.json();
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('El envío de correo está tardando más de lo esperado. Las credenciales se generaron correctamente, pero el correo puede tardar en llegar.');
          }
          throw error;
        }
      },
};

export type PhotoDeliverySize = 'thumb' | 'medium' | 'full';

function appendPhotoSizeParam(url: string, size?: PhotoDeliverySize): string {
  if (!size || size === 'medium') {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}size=${size}`;
}

function buildPhotoApiUrl(filename: string, size?: PhotoDeliverySize): string {
  const base = resolveApiUrl(
    `/api/components/_photos/${encodeURIComponent(filename)}`,
  );
  const withSize = appendPhotoSizeParam(base, size);
  if (typeof window === 'undefined') return withSize;
  return appendAccessTokenToUrl(withSize);
}

// Components endpoints
export const componentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
    status?: string;
    serialNumber?: string;
    ite?: string;
    quotationNumber?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.companyId) queryParams.append('companyId', params.companyId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.serialNumber) queryParams.append('serialNumber', params.serialNumber);
    if (params?.ite) queryParams.append('ite', params.ite);
    if (params?.quotationNumber) queryParams.append('quotationNumber', params.quotationNumber);

    const query = queryParams.toString();
    return apiClient.get<{ data: any[]; pagination: any }>(
      `/api/components${query ? `?${query}` : ''}`
    );
  },
  getById: (id: string) =>
    apiClient.get<{ data: any }>(`/api/components/${id}`),
  create: (componentData: FormData) =>
    apiClient.postFormData<{ data: any; documents: any[] }>(
      '/api/components',
      componentData
    ),
  update: (id: string, componentData: any) =>
    apiClient.patch(`/api/components/${id}`, componentData),
  delete: (id: string) => apiClient.delete(`/api/components/${id}`),
  addEvent: (id: string, eventData: FormData) =>
    apiClient.postFormData<{ data: any; documents: any[]; photos: string[] }>(`/api/components/${id}/events`, eventData),
  getDocuments: (id: string) =>
    apiClient.get<{ data: any[] }>(`/api/components/${id}/documents`),
  downloadDocument: (docId: string) => {
    return resolveApiUrl(`/api/components/_docs/${docId}/download`);
  },
  downloadDocumentWithFetch: async (docId: string, filename: string) => {
    const url = resolveApiUrl(`/api/components/_docs/${docId}/download`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Incluir cookies en la petición
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al descargar: ${response.statusText} - ${errorText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      logger.error('Error descargando documento', { error });
      throw error;
    }
  },
  getPhotoUrl: (photoPath: string, options?: { size?: PhotoDeliverySize }) => {
    if (!photoPath || photoPath.trim() === '') {
      return '';
    }

    const cleanPath = photoPath.trim();
    const size = options?.size;

    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      if (cleanPath.includes('/uploads/')) {
        const filename = cleanPath.split('/').pop() || '';
        if (filename) {
          return buildPhotoApiUrl(filename, size);
        }
      }
      return appendPhotoSizeParam(cleanPath, size);
    }

    if (cleanPath.includes('/api/components/_photos/')) {
      const normalized = cleanPath.startsWith('/')
        ? resolveApiUrl(cleanPath)
        : resolveApiUrl(`/${cleanPath}`);
      return appendPhotoSizeParam(normalized, size);
    }

    let filename = cleanPath;
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || filename;
    }
    filename = filename.replace(/^uploads\//, '');

    if (!filename.trim()) {
      return '';
    }

    return buildPhotoApiUrl(filename, size);
  },
  deleteDocument: (docId: string) =>
    apiClient.delete(`/api/components/_docs/${docId}`),
  getCompanies: () =>
    apiClient.get<{ data: any[] }>('/api/components/_meta/companies'),
  createCompany: (companyData: any) =>
    apiClient.post('/api/components/_meta/companies', companyData),
  updateCompany: (id: string, companyData: any) =>
    apiClient.patch(`/api/components/_meta/companies/${id}`, companyData),
  deleteCompany: (id: string) =>
    apiClient.delete(`/api/components/_meta/companies/${id}`),
  getCompanyStats: () =>
    apiClient.get<{ components: Record<string, number>; users: Record<string, number> }>(
      '/api/components/_meta/companies/_stats'
    ),
  getStats: () =>
    apiClient.get<{ total: number; byStatus: any; byCompany: any }>(
      '/api/components/_meta/stats'
    ),
};

