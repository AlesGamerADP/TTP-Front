// Interfaces para los servicios API

export interface IComponentsService {
  getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
    status?: string;
  }): Promise<{ data: any[]; pagination: any }>;
  
  getById(id: string): Promise<{ data: any }>;
  
  create(componentData: FormData): Promise<{ data: any; documents: any[] }>;
  
  update(id: string, componentData: any): Promise<{ data: any }>;
  
  delete(id: string): Promise<void>;
  
  addEvent(id: string, eventData: any): Promise<{ data: any }>;
  
  getDocuments(id: string): Promise<{ data: any[] }>;
  
  downloadDocument(docId: string): string;
  
  deleteDocument(docId: string): Promise<void>;
  
  getCompanies(): Promise<{ data: any[] }>;
  
  createCompany(companyData: any): Promise<{ data: any }>;
  
  deleteCompany(id: string): Promise<void>;
  
  getCompanyStats(): Promise<{ components: Record<string, number>; users: Record<string, number> }>;
  
  getStats(): Promise<{ total: number; byStatus: any; byCompany: any }>;
}

export interface IUsersService {
  getMe(): Promise<{ data: any }>;
  
  getAll(): Promise<{ data: any[] }>;
  
  create(userData: any): Promise<{ data: any }>;
  
  update(id: string, userData: any): Promise<{ data: any }>;
  
  delete(id: string): Promise<void>;
}

export interface IAuthService {
  login(codigo: string, password: string): Promise<{ token: string; refreshToken: string; user: any }>;
  
  refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }>;
  
  logout(refreshToken?: string): Promise<void>;
}

