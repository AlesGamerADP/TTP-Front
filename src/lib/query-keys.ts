export const queryKeys = {
  componentDetail: (id: string) => ['component-detail', id] as const,
  usersManagement: (search: string, role: string, company: string) =>
    ['users-management', search, role, company] as const,
  companiesCatalog: () => ['companies-catalog'] as const,
  componentsPaginated: (params: Record<string, unknown>) => ['components-paginated', params] as const,
};
