'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { deleteComponentMutation } from '@/features/components/mutations';

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

  const handleTimelineSaved = async () => {
    await reload(true);
    toast.success('Evento agregado exitosamente', 'El evento ha sido registrado en el historial.');
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
    handleTimelineSaved,
    isDeleting,
  };
}
