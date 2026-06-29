'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { componentsApi, usersApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/query-keys';
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
  const queryClient = useQueryClient();
  const queryKey = queryKeys.usersManagement(searchTerm, filterRole, filterCompany);

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
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

      return { companies: mappedCompanies, users: filteredUsers };
    },
    retry: 1,
  });

  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users-management'] });
    await refetch();
  };

  return {
    users: data?.users ?? [],
    companies: data?.companies ?? [],
    loading: isLoading,
    reload,
  };
}
