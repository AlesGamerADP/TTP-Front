import type { Company } from '@/features/auth/model';

type BackendCompanyRecord = {
  id: string;
  name: string;
  ruc?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

export function mapBackendCompany(record: BackendCompanyRecord): Company {
  return {
    id: record.id,
    name: record.name,
    ruc: record.ruc || '',
    contact_email: record.contact_email || '',
    contact_phone: record.contact_phone || '',
    address: record.address || '',
    is_active: record.is_active !== undefined ? record.is_active : true,
    created_at: record.created_at || new Date().toISOString(),
  };
}
