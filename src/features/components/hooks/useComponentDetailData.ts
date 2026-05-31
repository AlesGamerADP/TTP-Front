'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Component, ComponentEvent } from '@/features/components/model';
import { getComponentEventsQuery, getComponentQuery } from '@/features/components/queries';
import { componentsApi } from '@/lib/api';
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
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const [componentData, eventsData, documentsData] = await Promise.all([
          getComponentQuery(componentId),
          getComponentEventsQuery(componentId),
          componentsApi.getDocuments(componentId),
        ]);

        const eventsArray = Array.isArray(eventsData) ? eventsData : [];
        logger.debug('Eventos cargados', {
          total: eventsArray.length,
          eventosConFotos: eventsArray.filter((event) => event.fotos && event.fotos.length > 0).length,
        });

        setComponent(componentData);
        setEvents(eventsArray);
        setDocuments(Array.isArray(documentsData.data) ? documentsData.data : []);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isConnectionError =
          errorMessage?.includes('No se pudo conectar') ||
          errorMessage?.includes('Failed to fetch') ||
          (error instanceof Error && error.name === 'TypeError');

        if (isConnectionError) {
          logger.debug('Error de conexión al cargar datos del componente, se reintentará automáticamente', {
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
        }
      }
    },
    [componentId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useVisibilityPolling(
    () => reload(true),
  );

  return {
    component,
    events,
    documents,
    isLoading,
    reload,
  };
}
