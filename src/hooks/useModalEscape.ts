'use client';

import { useEffect } from 'react';

/** Cierra modales/diálogos abiertos con Escape */
export function useModalEscape(enabled: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onClose]);
}
