import { IComponentsService } from './interfaces';
import { componentsApi } from '../../lib/api';

/**
 * Servicio para gestión de componentes hidráulicos
 * Abstrae la lógica de llamadas API relacionadas con componentes
 */
export class ComponentsService implements IComponentsService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
    status?: string;
  }): Promise<{ data: any[]; pagination: any }> {
    return componentsApi.getAll(params);
  }

  async getById(id: string): Promise<{ data: any }> {
    return componentsApi.getById(id);
  }

  async create(componentData: FormData): Promise<{ data: any; documents: any[] }> {
    return componentsApi.create(componentData);
  }

  async update(id: string, componentData: any): Promise<{ data: any }> {
    return componentsApi.update(id, componentData) as Promise<{ data: any }>;
  }

  async delete(id: string): Promise<void> {
    await componentsApi.delete(id);
  }

  async addEvent(id: string, eventData: any): Promise<{ data: any }> {
    return componentsApi.addEvent(id, eventData) as Promise<{ data: any }>;
  }

  async getDocuments(id: string): Promise<{ data: any[] }> {
    return componentsApi.getDocuments(id) as Promise<{ data: any[] }>;
  }

  downloadDocument(docId: string): string {
    return componentsApi.downloadDocument(docId);
  }

  async deleteDocument(docId: string): Promise<void> {
    await componentsApi.deleteDocument(docId);
  }

  async getCompanies(): Promise<{ data: any[] }> {
    return componentsApi.getCompanies() as Promise<{ data: any[] }>;
  }

  async createCompany(companyData: any): Promise<{ data: any }> {
    return componentsApi.createCompany(companyData) as Promise<{ data: any }>;
  }

  async deleteCompany(id: string): Promise<void> {
    await componentsApi.deleteCompany(id);
  }

  async getCompanyStats(): Promise<{ components: Record<string, number>; users: Record<string, number> }> {
    return componentsApi.getCompanyStats() as Promise<{ components: Record<string, number>; users: Record<string, number> }>;
  }

  async getStats(): Promise<{ total: number; byStatus: any; byCompany: any }> {
    return componentsApi.getStats() as Promise<{ total: number; byStatus: any; byCompany: any }>;
  }
}

// Instancia singleton del servicio
export const componentsService = new ComponentsService();

