import type { User } from './auth';

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Administrador',
  user_manager: 'Gestor',
  client: 'Cliente',
  interno: 'Interno',
};

const ROLE_CODIGO_HINTS: Record<User['role'], string[]> = {
  admin: ['ADMIN', 'ADMINISTRADOR'],
  user_manager: ['MANAGER', 'GESTOR'],
  interno: ['INTERNO'],
  client: ['CLIENT', 'CLIENTE'],
};

export function getRoleLabel(role: User['role']): string {
  return ROLE_LABELS[role] ?? role;
}

/** Evita mostrar código y badge cuando dicen lo mismo (p. ej. ADMIN + Admin). */
export function shouldShowRoleBadge(codigo: string, role: User['role']): boolean {
  const normalized = codigo.trim().toUpperCase();
  const hints = ROLE_CODIGO_HINTS[role] ?? [];
  return !hints.some(
    (hint) => normalized === hint || normalized.includes(hint) || hint.includes(normalized),
  );
}
