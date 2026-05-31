// Tipos reconciliados: el dominio runtime vive en `auth.ts`.
// Este archivo queda para DTOs y compatibilidad de imports históricos.
export type {
  Company,
  ComponentStatus,
  User,
  UserRole,
} from './auth';

import type { Company, ComponentStatus, User } from './auth';

export interface HydraulicComponent {
  id: string;
  company_id: string; // COMPONENTE ASOCIADO A EMPRESA, NO A USUARIO
  company?: Company;
  component_type: string; // Tipo de componente (bomba, válvula, cilindro, etc.)
  serial_number: string;
  model?: string;
  brand?: string;
  quotation_number?: string; // NÚMERO DE COTIZACIÓN asignado al ingreso (ej: "COT-2024-001")
  current_status: ComponentStatus;
  ingress_date: string;
  estimated_completion?: string;
  actual_completion?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string; // Usuario interno que creó el ingreso
}

export interface ComponentStateHistory {
  id: string;
  component_id: string;
  status: ComponentStatus;
  changed_at: string;
  changed_by: string; // Usuario interno que realizó el cambio
  notes?: string;
  validation_photos?: string[]; // URLs de fotos
}

export interface Document {
  id: string;
  component_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
