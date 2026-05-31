'use client';

import { useCallback, useEffect, useState } from 'react';
import { componentsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { Company } from '@/features/auth/model';
import { mapBackendCompany } from '@/features/companies/mappers';

type CompanyStatsRecord = Record<string, { users: number; components: number }>;

type BackendCompanyStatsResponse = {
  components: Record<string, number>;
  users: Record<string, number>;
};

export function useCompanyManagementData() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyStats, setCompanyStats] = useState<Record<string, { users: number; components: number }>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const [companiesResponse, statsResponse] = await Promise.all([
        componentsApi.getCompanies(),
        componentsApi.getCompanyStats(),
      ]);

      const uniqueCompanies = (companiesResponse.data || []).filter(
        (company: Company, index: number, self: Company[]) =>
          index === self.findIndex((current) => current.id === company.id),
      );

      const mappedCompanies = uniqueCompanies.map((company) => mapBackendCompany(company));
      const companyStatsResponse = statsResponse as BackendCompanyStatsResponse;
      const mappedStats = mappedCompanies.reduce<CompanyStatsRecord>(
        (accumulator, company) => {
          accumulator[company.id] = {
            users: companyStatsResponse.users[company.id] || 0,
            components: companyStatsResponse.components[company.id] || 0,
          };
          return accumulator;
        },
        {},
      );

      setCompanies(mappedCompanies);
      setCompanyStats(mappedStats);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError =
        errorMessage?.includes('No se pudo conectar') ||
        errorMessage?.includes('Failed to fetch') ||
        (error instanceof Error && error.name === 'TypeError');

      if (isConnectionError) {
        logger.debug('Error de conexión al cargar empresas, se reintentará', {
          error: errorMessage,
        });
      } else {
        logger.error('Error loading company management data', { error });
      }

      setCompanies([]);
      setCompanyStats({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    companies,
    companyStats,
    loading,
    reload,
  };
}
