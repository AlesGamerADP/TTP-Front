export const COMPONENT_STATUSES = [
  'ingreso',
  'evaluacion',
  'informe',
  'cotizacion',
  'archivos_enviados',
  'cotizacion_aceptada',
  'reparacion',
  'listo_para_despacho',
  'despachado',
] as const;

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export type ApiErrorBody = {
  ok?: boolean;
  error: string;
  code?: string;
  message?: string;
  details?: { path: string; message: string }[];
};
