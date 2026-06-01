import { getCurrentSessionUser } from '@/features/auth/session';
import { componentsApi } from './api';
import { delay, isTransientApiError } from './api-errors';
import {
  type Component,
  type ComponentStatus,
} from './auth';
import { logger } from './logger';
import { mapBackendComponent } from '@/features/components/mappers';

const COMPONENTS_FETCH_MAX_ATTEMPTS = 3;
const COMPONENTS_FETCH_RETRY_DELAYS_MS = [400, 900, 1600];

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  companyId?: string;
  status?: ComponentStatus;
  serialNumber?: string;
  ite?: string;
  quotationNumber?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ComponentStats {
  total: number;
  byStatus: Record<ComponentStatus, number>;
  byCompany: Record<string, number>;
}

export async function getComponentsPaginated(
  params: PaginationParams
): Promise<PaginatedResponse<Component>> {
  // Generar clave de cache basada en los parámetros
  const cacheKey = `components_${JSON.stringify(params)}`;
  
  // Intentar obtener del cache primero
  const cached = componentCache.get(cacheKey);
  if (cached) {
    logger.debug('Componentes obtenidos del cache', { cacheKey });
    return cached;
  }
  
  try {
    const response = await componentsApi.getAll({
      page: params.page,
      limit: params.limit,
      search: params.search,
      companyId: params.companyId && params.companyId !== 'all' ? params.companyId : undefined,
      status: params.status && (params.status as string) !== 'all' ? params.status : undefined,
      serialNumber: params.serialNumber,
      ite: params.ite,
      quotationNumber: params.quotationNumber,
    });

    const mappedData = response.data.map(mapBackendComponent);
    const pagination = response.pagination;

    const result = {
      data: mappedData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1,
      },
    };
    
    // Guardar en cache (TTL más corto para datos dinámicos: 2 minutos)
    componentCache.set(cacheKey, result);
    
    return result;
  } catch (error: unknown) {
    // Solo loguear errores de conexión una vez para evitar spam
    const isConnectionError = 
      (error instanceof Error && error.message.includes('No se pudo conectar')) ||
      (error instanceof Error && error.message.includes('Failed to fetch')) ||
      (error instanceof Error && error.name === 'TypeError');
    
    if (isConnectionError) {
      logger.warn('Error de conexión al obtener componentes', { 
        error: error instanceof Error ? error.message : 'Error de conexión',
        willRetry: true,
      });
    } else {
      logger.error('Error fetching components', { error });
    }
    throw error;
  }
}

async function fetchComponentsPaginatedWithRetry(
  params: PaginationParams,
): Promise<PaginatedResponse<Component>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < COMPONENTS_FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      return await getComponentsPaginated(params);
    } catch (error) {
      lastError = error;

      if (!isTransientApiError(error) || attempt === COMPONENTS_FETCH_MAX_ATTEMPTS - 1) {
        throw error;
      }

      if (attempt === 0) {
        try {
          await getCurrentSessionUser();
        } catch {
          // La sesión puede recuperarse en el siguiente intento
        }
      }

      const delayMs = COMPONENTS_FETCH_RETRY_DELAYS_MS[attempt] ?? 1600;
      logger.debug('Reintentando carga de componentes', { attempt: attempt + 1, delayMs });
      await delay(delayMs);
    }
  }

  throw lastError;
}

export async function getComponentsPaginatedWithRetry(
  params: PaginationParams,
): Promise<PaginatedResponse<Component>> {
  return fetchComponentsPaginatedWithRetry(params);
}

export async function getComponentsByCompanyPaginated(
  companyId: string,
  params: Omit<PaginationParams, 'companyId'>
): Promise<PaginatedResponse<Component>> {
  return fetchComponentsPaginatedWithRetry({ ...params, companyId });
}

export async function getComponentsByCompanyPaginatedWithRetry(
  companyId: string,
  params: Omit<PaginationParams, 'companyId'>,
): Promise<PaginatedResponse<Component>> {
  return getComponentsByCompanyPaginated(companyId, params);
}

export async function getComponentStats(): Promise<ComponentStats> {
  // Intentar obtener del cache primero
  const cached = statsCache.get('stats');
  if (cached) {
    logger.debug('Stats obtenidos del cache');
    return cached;
  }
  
  try {
    const response = await componentsApi.getStats();
    
    // Mapear byStatus del backend
    const byStatus: Record<ComponentStatus, number> = {} as Record<ComponentStatus, number>;
    if (Array.isArray(response.byStatus)) {
      response.byStatus.forEach((item: { status: ComponentStatus; count: number | string }) => {
        byStatus[item.status as ComponentStatus] = Number(item.count) || 0;
      });
    }
    
    // Mapear byCompany del backend
    const byCompany: Record<string, number> = {};
    if (Array.isArray(response.byCompany)) {
      response.byCompany.forEach((item: { companyId?: string; count: number | string }) => {
        if (item.companyId) {
          byCompany[item.companyId] = Number(item.count) || 0;
        }
      });
    }
    
    const result = {
      total: response.total || 0,
      byStatus,
      byCompany,
    };
    
    // Guardar en cache (TTL más largo para stats: 5 minutos)
    statsCache.set('stats', result);
    
    return result;
  } catch (error) {
    logger.error('Error fetching component stats', { error });
    throw error;
  }
}

export async function searchComponents(
  query: string,
  limit = 10
): Promise<Component[]> {
  if (!query.trim()) return [];
  
  try {
    const response = await componentsApi.getAll({
      search: query,
      limit,
    });
    
    return response.data.map(mapBackendComponent);
  } catch (error) {
    logger.error('Error searching components', { error });
    return [];
  }
}

class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMinutes = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache con TTL más corto para componentes (2 minutos) - datos más dinámicos
export const componentCache = new SimpleCache<PaginatedResponse<Component>>(2);
// Cache con TTL más largo para stats (5 minutos) - datos menos frecuentes
export const statsCache = new SimpleCache<ComponentStats>(5);

export function invalidateComponentDataCaches(): void {
  componentCache.clear();
  statsCache.clear();
}

