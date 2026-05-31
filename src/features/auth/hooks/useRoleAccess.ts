'use client';

import { useMemo } from 'react';
import type { UserRole } from '@/features/auth/model';
import { canAccessComponentIngress, isBackofficeRole, isInternalRole } from '@/lib/roles';

export function useRoleAccess(role: UserRole | undefined) {
  return useMemo(
    () => ({
      isInternal: isInternalRole(role),
      isBackoffice: isBackofficeRole(role),
      canAccessIngress: canAccessComponentIngress(role),
      canManageUsers: role === 'admin' || role === 'user_manager',
      canManageCompanies: role === 'admin',
      canEditTimeline: role === 'admin' || isInternalRole(role),
    }),
    [role],
  );
}
