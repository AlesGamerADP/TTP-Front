const BASE_STATUS_BADGE_CLASS =
  'inline-flex max-w-[13rem] items-center justify-center rounded-md border px-3 py-1 !text-[11px] font-medium leading-[14px] tracking-tight text-center whitespace-normal shadow-none';

const STATUS_BADGE_STYLES: Record<string, string> = {
  ingreso: 'component-status-badge--ingreso',
  evaluacion: 'component-status-badge--evaluacion',
  informe: 'component-status-badge--informe',
  cotizacion: 'component-status-badge--cotizacion',
  archivos_enviados: 'component-status-badge--archivos-enviados',
  cotizacion_aceptada: 'component-status-badge--cotizacion-aceptada',
  reparacion: 'component-status-badge--reparacion',
  listo_para_despacho: 'component-status-badge--listo-para-despacho',
  despachado: 'component-status-badge--despachado',
};

export function getComponentStatusBadgeClass(status: string): string {
  return `${BASE_STATUS_BADGE_CLASS} ${STATUS_BADGE_STYLES[status] || 'component-status-badge--despachado'}`;
}
