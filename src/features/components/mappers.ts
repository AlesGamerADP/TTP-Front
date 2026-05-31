import type { Component, ComponentEvent, ComponentStatus } from './model';

type BackendCompanyEmbed = {
  id: string;
  name: string;
};

type BackendComponentRecord = {
  id: string;
  company_id?: string | null;
  companyId?: string | null;
  company?: BackendCompanyEmbed | null;
  serial_number: string;
  model?: string | null;
  ingress_date: string;
  current_status: string;
  description?: string | null;
  ite?: string | null;
  quotation_number?: string | null;
  created_at: string;
  created_by?: string | null;
};

type BackendComponentEventRecord = {
  id: string;
  component_id: string;
  status: string;
  notes?: string | null;
  validation_photos?: string[] | string | null;
  changed_by?: string | null;
  changed_at?: string | null;
  created_at: string;
};

function resolveCompanyId(record: BackendComponentRecord): string {
  const raw = record.company_id ?? record.companyId ?? record.company?.id;
  return raw ? String(raw) : '';
}

function mapEmbeddedCompany(record: BackendComponentRecord): Component['company'] | undefined {
  if (!record.company?.id || !record.company?.name) return undefined;
  return {
    id: String(record.company.id),
    name: record.company.name,
  };
}

export function mapBackendComponent(record: BackendComponentRecord): Component {
  const company_id = resolveCompanyId(record);
  const company = mapEmbeddedCompany(record);

  return {
    id: record.id,
    company_id,
    company,
    serial: record.serial_number,
    modelo: record.model || '',
    fecha_ingreso: record.ingress_date,
    estado: record.current_status as ComponentStatus,
    observaciones: record.description || undefined,
    ite: record.ite || undefined,
    numero_cotizacion: record.quotation_number || undefined,
    created_at: record.created_at,
    created_by: record.created_by || undefined,
  };
}

function normalizePhotos(value: BackendComponentEventRecord['validation_photos']): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((photo) => photo.trim())
      .filter((photo) => photo.length > 0);
  }
  return [String(value)];
}

export function mapBackendComponentEvent(record: BackendComponentEventRecord): ComponentEvent {
  return {
    id: record.id,
    component_id: record.component_id,
    estado: record.status as ComponentStatus,
    nota: record.notes || undefined,
    fotos: normalizePhotos(record.validation_photos),
    archivos: [],
    created_by: record.changed_by || '',
    created_at: record.changed_at || record.created_at,
  };
}
