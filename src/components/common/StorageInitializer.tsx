"use client";

import { useEffect } from 'react';
import { initStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';

/**
 * Componente que inicializa el sistema de almacenamiento
 * al cargar la aplicación
 */
export function StorageInitializer() {
  useEffect(() => {
    try {
      initStorage();
      logger.debug('Storage initialized on app load');
    } catch (error) {
      logger.error('Failed to initialize storage', { error });
    }
  }, []);

  return null; // Este componente no renderiza nada
}

