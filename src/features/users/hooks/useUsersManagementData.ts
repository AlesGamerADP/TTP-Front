'use client';

import { useCallback, useEffect, useState } from 'react';
import { componentsApi, usersApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { Company, User, UserRole } from '@/features/auth/model';
import { mapBackendCompany } from '@/features/companies/mappers';
import { mapBackendUser } from '@/features/users/mappers';

interface UseUsersManagementDataOptions {
  searchTerm: string;
  filterRole: UserRole | 'all';
  filterCompany: string;
}

export function useUsersManagementData({
  searchTerm,
  filterRole,
  filterCompany,
}: UseUsersManagementDataOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      const [companiesResponse, usersResponse] = await Promise.all([
        componentsApi.getCompanies(),
        usersApi.getAll(),
      ]);

      const mappedCompanies = (companiesResponse.data || []).map((company) => mapBackendCompany(company));
      const mappedUsers = (usersResponse.data || []).map((user) => mapBackendUser(user, mappedCompanies));

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const filteredUsers = mappedUsers.filter((user) => {
        const matchesSearch =
          !normalizedSearch ||
          user.full_name?.toLowerCase().includes(normalizedSearch) ||
          user.email?.toLowerCase().includes(normalizedSearch);
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesCompany = filterCompany === 'all' || user.company_id === filterCompany;

        return Boolean(matchesSearch && matchesRole && matchesCompany);
      });

      setCompanies(mappedCompanies);
      setUsers(filteredUsers);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError =
        errorMessage?.includes('No se pudo conectar') ||
        errorMessage?.includes('Failed to fetch') ||
        (error instanceof Error && error.name === 'TypeError');

      if (isConnectionError) {
        logger.debug('Error de conexión al cargar usuarios, se reintentará', {
          error: errorMessage,
        });
      } else {
        logger.error('Error loading users management data', { error });
      }

      setCompanies([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterRole, searchTerm]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    users,
    companies,
    loading,
    reload,
  };
}
