import { usesBrowserApiProxy } from '../api-config';
import { logger } from '../logger';
import { apiClient } from './client';

export const authApi = {
  login: async (codigo: string, password: string) => {
    const response = await apiClient.post<{
      user: unknown;
      csrfToken?: string;
      accessToken?: string;
      refreshToken?: string;
    }>('/api/auth/login', { codigo, password });
    if (response.csrfToken) {
      apiClient.setCsrfToken(response.csrfToken);
    }
    return response;
  },
  refresh: async () => {
    const response = await apiClient.post<{
      success: boolean;
      csrfToken?: string;
      accessToken?: string;
    }>('/api/auth/refresh', {});
    if (response.csrfToken) {
      apiClient.setCsrfToken(response.csrfToken);
    }
    if (!usesBrowserApiProxy() && response.accessToken) {
      const { setAccessToken } = await import('../auth-token');
      setAccessToken(response.accessToken);
    }
    return response;
  },
  logout: async () => {
    // Las cookies se limpian automáticamente por el servidor
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (error) {
      logger.warn('Error during logout', { error });
    }
  },
};
