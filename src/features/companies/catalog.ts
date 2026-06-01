import type { Company } from '@/features/auth/model';
import { mockCompanies } from '@/features/demo/mockData';
import { componentsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { mapBackendCompany } from './mappers';

let companiesCache: Company[] | null = null;
let companiesLoading: Promise<Company[]> | null = null;

export function primeCompaniesCatalog(companies: Company[]): void {
  companiesCache = companies;
}

export function invalidateCompaniesCatalog(): void {
  companiesCache = null;
}

export async function loadCompaniesCatalog(): Promise<Company[]> {
  if (companiesCache) return companiesCache;
  if (companiesLoading) return companiesLoading;

  companiesLoading = (async () => {
    try {
      logger.debug('Loading companies from API');
      const response = await componentsApi.getCompanies();
      const companies = (response.data || []).map(mapBackendCompany);
      companiesCache = companies;
      logger.debug('Companies loaded successfully', { count: companies.length });
      return companies;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConnectionError =
        message.includes('No se pudo conectar') ||
        message.includes('Failed to fetch') ||
        (error instanceof Error && error.name === 'TypeError');

      if (isConnectionError) {
        logger.debug('Error de conexión al cargar empresas (no crítico)', {
          error: message,
          willUseCache: companiesCache ? companiesCache.length > 0 : false,
        });
      } else {
        logger.error('Error loading companies', {
          error: message,
          willUseMockData: true,
        });
      }

      if (!companiesCache) {
        if (process.env.NODE_ENV === 'production') {
          logger.error('Companies API unavailable in production');
          companiesCache = [];
        } else {
          companiesCache = mockCompanies;
          logger.warn('Using mock companies as fallback (development only)');
        }
      }

      return companiesCache;
    } finally {
      companiesLoading = null;
    }
  })();

  return companiesLoading;
}

export function resolveCompanyName(
  companyId: string | null | undefined,
  catalog?: Company[],
  embeddedName?: string | null,
): string {
  if (embeddedName?.trim()) {
    return embeddedName.trim();
  }

  if (!companyId) {
    return 'Sin asignar';
  }

  const source =
    catalog ??
    companiesCache ??
    (process.env.NODE_ENV === 'development' ? mockCompanies : []);

  const company = source.find((item) => String(item.id) === String(companyId));
  return company?.name ?? 'Empresa no encontrada';
}

export function getCompanyNameFromCatalog(companyId: string, catalog?: Company[]): string {
  return resolveCompanyName(companyId, catalog);
}
