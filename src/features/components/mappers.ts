import type { Component, ComponentEvent, ComponentStatus } from './model';

type BackendCompanyRef = {
  id: string;
  name?: string | null;
};

type BackendComponentRecord = {
  id: string;
  company_id?: string | null;
  companyId?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  company?: BackendCompanyRef & { ruc?: string | null } | null;
  serial_number: string;
  servicio_principal?: string | null;
  fecha: string;
  current_status: string;
  solicitud_general?: string | null;
  hoja_evaluacion_he?: string | null;
  id_cotizacion?: string | null;
  atencion_persona?: string | null;
  item_nro?: number | null;
  cantidad?: number | null;
  nro_actividad?: string | null;
  descripcion_actividad?: string | null;
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

type BackendDocumentRecord = {
  id: string;
  file_name?: string | null;
  file_url: string;
  document_type?: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
};

export type BackendComponentDetailRecord = BackendComponentRecord & {
  state_history?: BackendComponentEventRecord[];
  documents?: BackendDocumentRecord[];
};

export function mapBackendComponent(record: BackendComponentRecord): Component {
  const companyId =
    record.company_id ?? record.companyId ?? record.company?.id ?? '';

  return {
    id: record.id,
    company_id: companyId,
    company_name:
      record.company?.name?.trim() ||
      record.company_name?.trim() ||
      record.companyName?.trim() ||
      undefined,
    serial: record.serial_number,
    servicio_principal: record.servicio_principal || '',
    fecha: record.fecha,
    estado: record.current_status as ComponentStatus,
    solicitud_general: record.solicitud_general || undefined,
    hoja_evaluacion_he: record.hoja_evaluacion_he || undefined,
    id_cotizacion: record.id_cotizacion || undefined,
    atencion_persona: record.atencion_persona || undefined,
    item_nro: record.item_nro || undefined,
    cantidad: record.cantidad || undefined,
    nro_actividad: record.nro_actividad || undefined,
    descripcion_actividad: record.descripcion_actividad || undefined,
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

export type ComponentDocumentRecord = {
  id: string;
  file_name?: string;
  file_url: string;
  document_type?: string | null;
  uploaded_at?: string;
  created_at?: string;
};

function mapBackendDocument(record: BackendDocumentRecord): ComponentDocumentRecord {
  return {
    id: record.id,
    file_name: record.file_name ?? undefined,
    file_url: record.file_url,
    document_type: record.document_type,
    uploaded_at: record.uploaded_at ?? undefined,
    created_at: record.created_at ?? undefined,
  };
}

/** Un solo GET /components/:id devuelve componente, historial y documentos. */
export function mapComponentDetailFromApi(record: BackendComponentDetailRecord): {
  component: Component;
  events: ComponentEvent[];
  documents: ComponentDocumentRecord[];
} {
  return {
    component: mapBackendComponent(record),
    events: (record.state_history ?? []).map(mapBackendComponentEvent),
    documents: (record.documents ?? []).map(mapBackendDocument),
  };
}
