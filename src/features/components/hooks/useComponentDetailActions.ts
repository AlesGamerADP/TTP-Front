'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import type { ComponentEvent, ComponentStatus } from '@/features/components/model';
import {
  addComponentEventMutation,
  deleteComponentMutation,
  updateComponentStatusMutation,
} from '@/features/components/mutations';
import { STATUS_LABELS } from '@/features/components/model';

interface UseComponentDetailActionsOptions {
  componentId: string;
  reload: (silent?: boolean) => Promise<void>;
  onBack: () => void;
}

export function useComponentDetailActions({
  componentId,
  reload,
  onBack,
}: UseComponentDetailActionsOptions) {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEventAdded = async (newEvent: ComponentEvent) => {
    try {
      if (newEvent.fotos.length === 0 && newEvent.archivos.length === 0) {
        await reload(true);
        toast.success('Evento agregado exitosamente', 'El evento ha sido registrado en el historial.');
        return;
      }

      await addComponentEventMutation({
        component_id: newEvent.component_id,
        estado: newEvent.estado,
        nota: newEvent.nota,
        created_by: newEvent.created_by,
      });
      await reload(true);
      toast.success('Evento agregado exitosamente', 'El evento ha sido registrado en el historial.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo agregar el evento. Por favor, intenta nuevamente.';
      toast.error('Error al agregar evento', message);
      throw error;
    }
  };

  const handleStatusUpdated = async (newStatus: ComponentStatus) => {
    try {
      await updateComponentStatusMutation(componentId, newStatus);
      await reload(true);
      toast.success(
        'Estado actualizado exitosamente',
        `El estado del componente ha sido actualizado a: ${STATUS_LABELS[newStatus]}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el estado. Por favor, intenta nuevamente.';
      toast.error('Error al actualizar estado', message);
      throw error;
    }
  };

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
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el componente. Por favor, intenta nuevamente.';
      toast.error('Error al eliminar el componente', message);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDelete,
    handleEventAdded,
    handleStatusUpdated,
    isDeleting,
  };
}
