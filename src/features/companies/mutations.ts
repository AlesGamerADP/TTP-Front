import { invalidateCompaniesCatalog } from './catalog';
import { componentsApi } from '@/lib/api';

export interface CompanyMutationPayload {
  name: string;
  ruc?: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

export function createCompanyMutation(payload: CompanyMutationPayload) {
  invalidateCompaniesCatalog();
  return componentsApi.createCompany(payload);
}

export function updateCompanyMutation(companyId: string, payload: CompanyMutationPayload) {
  invalidateCompaniesCatalog();
  return componentsApi.updateCompany(companyId, payload);
}

export function deleteCompanyMutation(companyId: string) {
  invalidateCompaniesCatalog();
  return componentsApi.deleteCompany(companyId);
}
