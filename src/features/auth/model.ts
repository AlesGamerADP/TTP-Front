export type UserRole = 'admin' | 'user_manager' | 'client' | 'internal' | 'interno';

export interface Company {
  id: string;
  name: string;
  ruc?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string | null;
  codigo: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  company?: Company;
  access_code?: string;
  is_active?: boolean;
  created_at: string;
  created_by?: string;
  last_login?: string;
}
