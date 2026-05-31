import type { UserRole } from '@/features/auth/model';

export type ApiUserRole = 'admin' | 'user_manager' | 'client' | 'internal';

export const UI_USER_ROLES = ['admin', 'user_manager', 'client', 'interno'] as const;
export const API_USER_ROLES = ['admin', 'user_manager', 'client', 'internal'] as const;

/** Alinea el rol del backend (`internal`) con el usado en la UI (`interno`). */
export function normalizeUserRole(role: string): UserRole {
  if (role === 'internal' || role === 'interno') return 'interno';
  if (role === 'admin' || role === 'user_manager' || role === 'client') {
    return role;
  }
  return role as UserRole;
}

/** Convierte el vocabulario de la UI al contrato que hoy espera el backend. */
export function toApiUserRole(role: UserRole | ApiUserRole): ApiUserRole {
  if (role === 'interno' || role === 'internal') return 'internal';
  return role;
}

export function isInternalRole(role: string | undefined): boolean {
  return role === 'interno' || role === 'internal';
}

export function isBackofficeRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'user_manager' || isInternalRole(role);
}

export function canAccessComponentIngress(role: string | undefined): boolean {
  return role === 'admin' || role === 'user_manager' || isInternalRole(role);
}
