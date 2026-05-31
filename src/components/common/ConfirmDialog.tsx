'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { buttonVariants } from '../ui/button';
import { cn } from '../ui/utils';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive',
  isLoading = false,
}: ConfirmDialogProps) {
  // Validar props y loggear errores
  if (!title || title.trim() === '') {
    console.error('[ConfirmDialog] Error: title es requerido y no puede estar vacío', {
      title,
      description,
      variant,
    });
    // Usar un título por defecto si no se proporciona
    title = 'Confirmar acción';
  }

  if (!description || description.trim() === '') {
    console.warn('[ConfirmDialog] Advertencia: description está vacío', {
      title,
      description,
    });
    description = '¿Está seguro de continuar?';
  }

  const handleConfirm = async () => {
    try {
      console.log('[ConfirmDialog] Confirmación iniciada', { title });
      await onConfirm();
      console.log('[ConfirmDialog] Confirmación completada exitosamente', { title });
      onOpenChange(false);
    } catch (error) {
      console.error('[ConfirmDialog] Error en confirmación:', {
        title,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      // No cerrar el diálogo si hay un error, para que el usuario pueda ver el mensaje
      throw error;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log('[ConfirmDialog] Estado cambiado:', { 
      title, 
      open: newOpen,
      previousOpen: open 
    });
    onOpenChange(newOpen);
  };

  // Asegurar que title y description siempre tengan valores válidos
  const safeTitle = React.useMemo(() => title?.trim() || 'Confirmar acción', [title]);
  const safeDescription = React.useMemo(() => description?.trim() || '¿Está seguro de continuar?', [description]);

  console.log('[ConfirmDialog] Renderizando diálogo:', {
    open,
    safeTitle,
    safeDescription,
    variant,
    isLoading,
    hasTitle: !!safeTitle,
    titleLength: safeTitle.length,
  });

  // Asegurar que el título siempre tenga contenido
  if (!safeTitle || safeTitle.length === 0) {
    console.error('[ConfirmDialog] CRÍTICO: safeTitle está vacío después de validación', {
      originalTitle: title,
      safeTitle,
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {variant === 'destructive' ? (
            <div className="flex items-center gap-3">
              <AlertTriangle
                className="h-5 w-5 text-destructive shrink-0"
                aria-hidden="true"
              />
              <AlertDialogTitle>{safeTitle}</AlertDialogTitle>
            </div>
          ) : (
            <AlertDialogTitle>{safeTitle}</AlertDialogTitle>
          )}
          <AlertDialogDescription>
            {safeDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            aria-label={cancelText}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              variant === 'destructive'
                ? 'header-action-button header-action-button--danger font-medium'
                : buttonVariants({ variant: 'default' }),
            )}
            aria-label={confirmText}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

