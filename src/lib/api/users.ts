import { API_BASE_URL } from './base-url';
import { apiClient } from './client';

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
