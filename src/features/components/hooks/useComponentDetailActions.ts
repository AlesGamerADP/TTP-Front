'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { addComponentEventMutation, deleteComponentMutation } from '@/features/components/mutations';
import type { OptimisticTimelinePayload } from './useComponentDetailData';
import type { ComponentStatus } from '@/features/components/model';

export interface TimelineSubmitInput {
  tempId: string;
  selectedStatus: ComponentStatus;
  eventNote: string;
  eventPhotos: File[];
  eventFiles: File[];
  createdBy: string;
  photoPreviewUrls: string[];
}

interface UseComponentDetailActionsOptions {
  componentId: string;
  reload: (silent?: boolean) => Promise<void>;
  onBack: () => void;
  applyOptimisticTimelineUpdate: (payload: OptimisticTimelinePayload) => void;
  rollbackOptimisticTimelineUpdate: (tempId: string) => void;
}

export function useComponentDetailActions({
  componentId,
  reload,
  onBack,
  applyOptimisticTimelineUpdate,
  rollbackOptimisticTimelineUpdate,
}: UseComponentDetailActionsOptions) {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingTimeline, setIsSavingTimeline] = useState(false);

  const submitTimelineUpdate = useCallback(
    async (input: TimelineSubmitInput): Promise<void> => {
      const hasAttachments = input.eventPhotos.length > 0 || input.eventFiles.length > 0;

      if (hasAttachments) {
        setIsSavingTimeline(true);
      }

      try {
        if (!hasAttachments) {
          applyOptimisticTimelineUpdate({
            tempId: input.tempId,
            status: input.selectedStatus,
            note: input.eventNote.trim() || undefined,
            photoPreviewUrls: [],
            fileNames: [],
            createdBy: input.createdBy,
          });
        }

        await addComponentEventMutation({
          component_id: componentId,
          estado: input.selectedStatus,
          nota: input.eventNote.trim() || undefined,
          fotos: input.eventPhotos.length > 0 ? input.eventPhotos : undefined,
          archivos: input.eventFiles.length > 0 ? input.eventFiles : undefined,
          created_by: input.createdBy,
        });

        await reload(true);

        toast.success(
          'Evento registrado',
          hasAttachments
            ? 'Estado, fotos y documentos ya están en el servidor.'
            : 'El cambio ya es visible para todos los usuarios.',
        );
      } catch (error) {
        if (!hasAttachments) {
          rollbackOptimisticTimelineUpdate(input.tempId);
        }

        const message =
          error instanceof Error ? error.message : 'No se pudo guardar. Intenta de nuevo.';
        toast.error('Error al guardar', message);
        throw error;
      } finally {
        if (hasAttachments) {
          setIsSavingTimeline(false);
        }
      }
    },
    [
      applyOptimisticTimelineUpdate,
      componentId,
      reload,
      rollbackOptimisticTimelineUpdate,
      toast,
    ],
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteComponentMutation(componentId);
      toast.success(
        'Componente eliminado exitosamente',
        'El componente y todos sus datos asociados han sido eliminados permanentemente.',
      );
      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo eliminar el componente. Por favor, intenta nuevamente.';
      toast.error('Error al eliminar el componente', message);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDelete,
    submitTimelineUpdate,
    isSavingTimeline,
    isDeleting,
  };
}
