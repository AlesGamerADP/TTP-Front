export const TIMELINE_NOTE_TEMPLATES: { id: string; label: string; text: string }[] = [
  {
    id: 'eval-completed',
    label: 'Evaluación completada',
    text: 'Evaluación técnica completada. Se adjuntan evidencias y documentación de soporte.',
  },
  {
    id: 'waiting-parts',
    label: 'En espera de repuestos',
    text: 'Componente en espera de repuestos. Se notificará al cliente cuando se reciban.',
  },
  {
    id: 'repair-done',
    label: 'Reparación finalizada',
    text: 'Reparación finalizada según procedimiento. Listo para validación o entrega.',
  },
  {
    id: 'client-approved',
    label: 'Aprobación del cliente',
    text: 'El cliente ha aprobado el avance. Se procede con el siguiente estado del flujo.',
  },
];
