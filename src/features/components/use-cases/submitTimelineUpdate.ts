import type { ComponentStatus } from '@/features/components/model';
import { addComponentEventMutation } from '@/features/components/mutations';

interface SubmitTimelineUpdateInput {
  componentId: string;
  selectedStatus: ComponentStatus;
  eventNote: string;
  eventPhotos: File[];
  eventFiles: File[];
  createdBy: string;
  /** Tras guardar en servidor: una sola recarga de datos + toast. */
  onSaved: () => Promise<void> | void;
}

export async function submitTimelineUpdate({
  componentId,
  selectedStatus,
  eventNote,
  eventPhotos,
  eventFiles,
  createdBy,
  onSaved,
}: SubmitTimelineUpdateInput): Promise<void> {
  await addComponentEventMutation({
    component_id: componentId,
    estado: selectedStatus,
    nota: eventNote.trim() || undefined,
    fotos: eventPhotos.length > 0 ? eventPhotos : undefined,
    archivos: eventFiles.length > 0 ? eventFiles : undefined,
    created_by: createdBy,
  });

  // POST /:id/events ya actualiza current_status; no hace falta PATCH adicional.
  await onSaved();
}
