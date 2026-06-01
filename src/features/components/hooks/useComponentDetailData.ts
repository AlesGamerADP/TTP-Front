'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Component, ComponentEvent } from '@/features/components/model';
import { getComponentDetailBundle } from '@/features/components/queries';
import { logger } from '@/lib/logger';
import { useVisibilityPolling } from '@/features/shared/hooks/useVisibilityPolling';

export interface ComponentDocumentRecord {
  id: string;
  file_name?: string;
  file_url: string;
  document_type?: string | null;
  uploaded_at?: string;
  created_at?: string;
}

export function useComponentDetailData(componentId: string) {
  const [component, setComponent] = useState<Component | undefined>(undefined);
  const [events, setEvents] = useState<ComponentEvent[]>([]);
  const [documents, setDocuments] = useState<ComponentDocumentRecord[]>([]);
  /** Bloquea solo hasta tener datos mínimos del componente (título/header = LCP). */
  const [isLoading, setIsLoading] = useState(true);
  /** Historial / documentos aún cargando (raro tras bundle unificado). */
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setIsLoadingDetails(true);
      }

      try {
        const bundle = await getComponentDetailBundle(componentId);
        if (!bundle) {
          setComponent(undefined);
          setEvents([]);
          setDocuments([]);
          return;
        }

        setComponent(bundle.component);
        setEvents(bundle.events);
        setDocuments(bundle.documents);

        logger.debug('Detalle de componente cargado', {
          componentId,
          events: bundle.events.length,
          documents: bundle.documents.length,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isConnectionError =
          errorMessage?.includes('No se pudo conectar') ||
          errorMessage?.includes('Failed to fetch') ||
          (error instanceof Error && error.name === 'TypeError');

        if (isConnectionError) {
          logger.debug('Error de conexión al cargar detalle, se reintentará', {
            componentId,
            error: errorMessage,
          });
        } else {
          logger.error('Error loading component data', { error, componentId });
        }

        setEvents([]);
        setDocuments([]);
      } finally {
        if (!silent) {
          setIsLoading(false);
          setIsLoadingDetails(false);
        }
      }
    },
    [componentId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useVisibilityPolling(() => reload(true));

  return {
    component,
    events,
    documents,
    isLoading,
    isLoadingDetails,
    reload,
  };
}
