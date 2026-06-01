'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Component, ComponentEvent } from '@/features/components/model';
import { getComponentEventsQuery, getComponentQuery } from '@/features/components/queries';
import { componentsApi } from '@/lib/api';
import { isConnectionApiError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { useVisibilityPolling } from '@/features/shared/hooks/useVisibilityPolling';
import { useComponentRealtime } from '@/features/components/realtime/useComponentRealtime';

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
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  const reload = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setIsLoadingDetails(true);
      }

      try {
        const componentData = await getComponentQuery(componentId);

        if (!componentData) {
          setComponent(undefined);
          setEvents([]);
          setDocuments([]);
          return;
        }

        setComponent(componentData);
        if (!silent) {
          setIsLoading(false);
        }

        const [eventsData, documentsData] = await Promise.all([
          getComponentEventsQuery(componentId),
          componentsApi.getDocuments(componentId),
        ]);

        const eventsArray = Array.isArray(eventsData) ? eventsData : [];
        logger.debug('Eventos cargados', {
          total: eventsArray.length,
          eventosConFotos: eventsArray.filter((event) => event.fotos && event.fotos.length > 0).length,
        });

        setEvents(eventsArray);
        setDocuments(Array.isArray(documentsData.data) ? documentsData.data : []);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isConnectionApiError(error)) {
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

  useComponentRealtime({
    componentId,
    onEvent: () => {
      void reload(true);
    },
  });

  return {
    component,
    events,
    documents,
    isLoading,
    isLoadingDetails,
    reload,
  };
}
