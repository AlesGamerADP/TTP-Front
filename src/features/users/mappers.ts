import type { Company, User } from '@/features/auth/model';
import { normalizeUserRole, type ApiUserRole } from '@/lib/roles';

type BackendUserCompanyRecord = {
  id: string;
};

type BackendUserRecord = {
  id: string;
  company?: BackendUserCompanyRecord | null;
  access_code?: string | null;
  auth_user_id?: string | null;
  codigo?: string | null;
  email?: string | null;
  full_name?: string | null;
  role: string;
  is_active?: boolean;
  created_at?: string | null;
  created_by?: string | null;
  last_login?: string | null;
};

export function mapBackendUser(user: BackendUserRecord, companies: Company[]): User {
  const company = companies.find((item) => item.id === user.company?.id);

  return {
    id: user.id,
    codigo: user.access_code || user.auth_user_id || user.codigo || '',
    email: user.email || undefined,
    full_name: user.full_name || undefined,
    role: normalizeUserRole(user.role as ApiUserRole),
    company_id: user.company?.id || null,
    company: company || undefined,
    access_code: user.access_code || undefined,
    is_active: user.is_active !== undefined ? user.is_active : true,
    created_at: user.created_at || new Date().toISOString(),
    created_by: user.created_by || 'system',
    last_login: user.last_login || undefined,
  };
}
