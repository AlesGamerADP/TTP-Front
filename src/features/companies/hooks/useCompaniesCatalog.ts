'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Company } from '@/features/auth/model';
import { loadCompaniesCatalog } from '@/features/companies/catalog';
import { logger } from '@/lib/logger';

interface UseCompaniesCatalogOptions {
  autoLoad?: boolean;
}

export function useCompaniesCatalog(options: UseCompaniesCatalogOptions = {}) {
  const { autoLoad = true } = options;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const refreshCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const catalog = await loadCompaniesCatalog();
      setCompanies(catalog);
      return catalog;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el catálogo';
      logger.error('Error loading companies catalog', { err });
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      setIsLoading(false);
      return;
    }

    void refreshCompanies();
  }, [autoLoad, refreshCompanies]);

  return {
    companies,
    isLoading,
    error,
    refreshCompanies,
  };
}
