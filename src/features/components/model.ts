import type { Company } from '@/features/auth/model';

export type ComponentStatus =
  | 'ingreso'
  | 'evaluacion'
  | 'informe'
  | 'cotizacion'
  | 'archivos_enviados'
  | 'cotizacion_aceptada'
  | 'reparacion'
  | 'listo_para_despacho'
  | 'despachado';

export interface Component {
  id: string;
  company_id: string;
  company?: Pick<Company, 'id' | 'name'>;
  serial: string;
  modelo: string;
  fecha_ingreso: string;
  estado: ComponentStatus;
  observaciones?: string;
  ite?: string;
  numero_cotizacion?: string;
  created_at: string;
  created_by?: string;
}

export interface ComponentEvent {
  id: string;
  component_id: string;
  estado: ComponentStatus;
  nota?: string;
  fotos: string[];
  archivos: string[];
  created_by: string;
  created_at: string;
}

export const STATUS_LABELS: Record<ComponentStatus, string> = {
  ingreso: 'Ingreso de componente',
  evaluacion: 'Evaluación de componente',
  informe: 'Elaboración de informe técnico',
  cotizacion: 'Elaboración de cotización',
  archivos_enviados: 'Envío de archivos',
  cotizacion_aceptada: 'Aceptación de cotización',
  reparacion: 'Proceder a reparación',
  listo_para_despacho: 'Componente listo para despacho',
  despachado: 'Despachado',
};

export const STATUS_ORDER: ComponentStatus[] = [
  'ingreso',
  'evaluacion',
  'informe',
  'cotizacion',
  'archivos_enviados',
  'cotizacion_aceptada',
  'reparacion',
  'listo_para_despacho',
  'despachado',
];

export function getNextStatus(currentStatus: ComponentStatus): ComponentStatus | null {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
    return null;
  }
  return STATUS_ORDER[currentIndex + 1];
}

export function canUpdateToStatus(currentStatus: ComponentStatus, newStatus: ComponentStatus): boolean {
  return newStatus === currentStatus || getNextStatus(currentStatus) === newStatus;
}

export type ComponentEventGroup = {
  estado: ComponentStatus;
  events: ComponentEvent[];
  latestAt: string;
};

export function groupEventsByStatus(events: ComponentEvent[]): ComponentEventGroup[] {
  const byStatus = new Map<ComponentStatus, ComponentEvent[]>();

  for (const event of events) {
    const group = byStatus.get(event.estado) ?? [];
    group.push(event);
    byStatus.set(event.estado, group);
  }

  return Array.from(byStatus.entries())
    .map(([estado, groupEvents]) => {
      const sorted = [...groupEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return {
        estado,
        events: sorted,
        latestAt: sorted[0].created_at,
      };
    })
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}
