/** @deprecated Usar tipos de `@/features/auth/model` y `@/features/components/model`. */
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
  company_id: string;
  company?: Company;
  serial_number: string;
  id_cotizacion?: string;
  fecha: string;
  hoja_evaluacion_he?: string;
  solicitud_general?: string;
  atencion_persona?: string;
  item_nro?: number;
  servicio_principal: string;
  cantidad?: number;
  nro_actividad?: string;
  descripcion_actividad?: string;
  current_status: ComponentStatus;
  estimated_completion?: string;
  actual_completion?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
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
