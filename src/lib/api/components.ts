import { logger } from '../logger';
import { API_BASE_URL, toSameOriginApiUrl } from './base-url';
import { apiClient } from './client';

export type PhotoDeliverySize = 'thumb' | 'medium' | 'full';

export function appendPhotoSizeParam(url: string, size?: PhotoDeliverySize): string {
  if (!size || size === 'medium') {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}size=${size}`;
}

export function buildPhotoApiUrl(filename: string, size?: PhotoDeliverySize): string {
  const path = `/api/components/_photos/${encodeURIComponent(filename)}`;
  const base = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  return toSameOriginApiUrl(appendPhotoSizeParam(base, size));
}

export type KpiResponse = {
  byStatus: { status: string; count: number }[];
  bottleneck: { status: string; count: number }[];
  staleCount: number;
  staleDays: number;
  stalePreview: {
    id: string;
    serial_number: string;
    current_status: string;
    updated_at: string | null;
  }[];
  avgDaysInStatus: { status: string; avgDays: number }[];
};

export const componentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
    status?: string;
    serialNumber?: string;
    hojaEvaluacionHe?: string;
    idCotizacion?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.companyId) queryParams.append('companyId', params.companyId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.serialNumber) queryParams.append('serialNumber', params.serialNumber);
    if (params?.hojaEvaluacionHe) queryParams.append('hojaEvaluacionHe', params.hojaEvaluacionHe);
    if (params?.idCotizacion) queryParams.append('idCotizacion', params.idCotizacion);

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
  addEventMetadata: (id: string, body: { status: string; notes?: string }) =>
    apiClient.post<{ data: any; pendingAttachments?: boolean }>(`/api/components/${id}/events/metadata`, body),
  addEventAttachments: (id: string, eventId: string, eventData: FormData) =>
    apiClient.postFormData<{ data: any; documents: any[]; photos: string[] }>(
      `/api/components/${id}/events/${eventId}/attachments`,
      eventData,
    ),
  touchPresence: (id: string) => apiClient.post<{ ok: boolean }>(`/api/components/${id}/presence`, {}),
  leavePresence: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/components/${id}/presence`),
  getAuditTrail: (id: string) =>
    apiClient.get<{ data: { timeline: unknown[]; auditLogs: unknown[] } }>(`/api/components/${id}/audit-trail`),
  exportHistory: (id: string, format: 'csv' | 'json' = 'csv') => {
    const path = `/api/components/${id}/export?format=${format}`;
    const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    return toSameOriginApiUrl(url);
  },
  getKpis: (staleDays = 7) =>
    apiClient.get<KpiResponse>(`/api/components/_meta/kpis?staleDays=${staleDays}`),
  getStaleComponents: (days = 7, limit = 20) =>
    apiClient.get<{ data: unknown[]; days: number }>(
      `/api/components/_meta/stale?days=${days}&limit=${limit}`,
    ),
  getDocuments: (id: string) =>
    apiClient.get<{ data: any[] }>(`/api/components/${id}/documents`),
  downloadDocument: (docId: string) => {
    const path = `/api/components/_docs/${docId}/download`;
    const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    return toSameOriginApiUrl(url);
  },
  /** URL same-origin para iframe/object en iOS (inline, no blob). Requiere ?inline=1 en el proxy. */
  previewDocumentInline: (docId: string) => {
    const path = `/api/components/_docs/${docId}/download?inline=1`;
    const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    return toSameOriginApiUrl(url);
  },
  getDocumentThumbnailUrl: (docId: string, size: PhotoDeliverySize = 'thumb') => {
    const path = `/api/components/_docs/${docId}/thumbnail?size=${size}`;
    const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    return toSameOriginApiUrl(url);
  },
  downloadDocumentWithFetch: async (docId: string, filename: string) => {
    const url = componentsApi.downloadDocument(docId);

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
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
      if (cleanPath.includes('/api/components/_photos/')) {
        return toSameOriginApiUrl(appendPhotoSizeParam(cleanPath, size));
      }
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
        ? `${API_BASE_URL}${cleanPath}`
        : `${API_BASE_URL}/${cleanPath}`;
      return toSameOriginApiUrl(appendPhotoSizeParam(normalized, size));
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
