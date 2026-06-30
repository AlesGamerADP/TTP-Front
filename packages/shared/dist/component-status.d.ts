export declare const COMPONENT_STATUSES: readonly ["ingreso", "evaluacion", "informe", "cotizacion", "archivos_enviados", "cotizacion_aceptada", "reparacion", "listo_para_despacho", "despachado"];
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];
export type ApiErrorBody = {
    ok?: boolean;
    error: string;
    code?: string;
    message?: string;
    details?: {
        path: string;
        message: string;
    }[];
};
