'use client';

import { useMemo } from 'react';
import { toast as sonnerToast } from 'sonner';

export function useToast() {
  const toast = useMemo(() => ({
    success: (message: string, description?: string) => {
      sonnerToast.success(message, {
        description,
        duration: 2000,
      });
    },
    error: (message: string, description?: string, options?: { id?: string }) => {
      sonnerToast.error(message, {
        description,
        duration: 2000,
        id: options?.id,
      });
    },
    info: (message: string, description?: string) => {
      sonnerToast.info(message, {
        description,
        duration: 2000,
      });
    },
    warning: (message: string, description?: string) => {
      sonnerToast.warning(message, {
        description,
        duration: 2000,
      });
    },
    loading: (message: string) => {
      return sonnerToast.loading(message);
    },
    promise: <T,>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
      }: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return sonnerToast.promise(promise, {
        loading,
        success,
        error,
      });
    },
  }), []);

  return toast;
}

