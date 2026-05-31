import type { ComponentEvent, ComponentStatus } from '@/features/components/model';
import { addComponentEventMutation } from '@/features/components/mutations';

interface SubmitTimelineUpdateInput {
  componentId: string;
  selectedStatus: ComponentStatus;
  eventNote: string;
  eventPhotos: File[];
  eventFiles: File[];
  createdBy: string;
  onEventAdded: (event: ComponentEvent) => Promise<void> | void;
  onStatusUpdated: (newStatus: ComponentStatus) => Promise<void> | void;
}

export async function submitTimelineUpdate({
  componentId,
  selectedStatus,
  eventNote,
  eventPhotos,
  eventFiles,
  createdBy,
  onEventAdded,
  onStatusUpdated,
}: SubmitTimelineUpdateInput): Promise<void> {
  await addComponentEventMutation({
    component_id: componentId,
    estado: selectedStatus,
    nota: eventNote.trim() || undefined,
    fotos: eventPhotos.length > 0 ? eventPhotos : undefined,
    archivos: eventFiles.length > 0 ? eventFiles : undefined,
    created_by: createdBy,
  });

  const tempEvent: ComponentEvent = {
    id: Date.now().toString(),
    component_id: componentId,
    estado: selectedStatus,
    nota: eventNote.trim() || undefined,
    fotos: [],
    archivos: [],
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };

  await onEventAdded(tempEvent);
  await onStatusUpdated(selectedStatus);
}
