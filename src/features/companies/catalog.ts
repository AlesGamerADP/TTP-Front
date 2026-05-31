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

function getCompaniesCatalogSource(explicit?: Company[]): Company[] {
  if (explicit && explicit.length > 0) return explicit;
  if (companiesCache && companiesCache.length > 0) return companiesCache;
  if (process.env.NODE_ENV !== 'production') return mockCompanies;
  return companiesCache ?? [];
}

export function mergeCompaniesIntoCatalog(companies: Company[]): void {
  if (companies.length === 0) return;

  const byId = new Map(
    (companiesCache ?? []).map((company) => [String(company.id), company]),
  );

  for (const company of companies) {
    const id = String(company.id);
    if (!byId.has(id)) {
      byId.set(id, company);
    }
  }

  companiesCache = Array.from(byId.values());
}

type BackendCompanyEmbed = { id: string; name: string };

export function enrichCompaniesCatalogFromRecords(
  records: Array<{ company?: BackendCompanyEmbed | null }>,
): void {
  const toMerge: Company[] = [];

  for (const record of records) {
    if (!record.company?.id || !record.company?.name) continue;
    toMerge.push({
      id: String(record.company.id),
      name: record.company.name,
      created_at: new Date().toISOString(),
    });
  }

  if (toMerge.length > 0) {
    mergeCompaniesIntoCatalog(toMerge);
  }
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

export type ResolveCompanyNameOptions = {
  companies?: Company[];
  fallbackName?: string;
};

export function getCompanyNameFromCatalog(
  companyId: string,
  options?: ResolveCompanyNameOptions,
): string {
  const normalizedId = companyId?.trim();
  if (!normalizedId) return 'Sin asignar';

  const source = getCompaniesCatalogSource(options?.companies);
  const company = source.find((item) => String(item.id) === normalizedId);
  if (company?.name) return company.name;
  if (options?.fallbackName?.trim()) return options.fallbackName.trim();
  return 'Empresa no encontrada';
}

export function resolveComponentCompanyName(
  component: { company_id: string; company?: Pick<Company, 'id' | 'name'> },
  companies?: Company[],
): string {
  const normalizedId = component.company_id?.trim();
  if (!normalizedId) return 'Sin asignar';

  if (component.company?.name?.trim()) {
    return component.company.name.trim();
  }

  return getCompanyNameFromCatalog(normalizedId, { companies });
}
