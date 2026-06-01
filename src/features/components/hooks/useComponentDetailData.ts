'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Component, ComponentEvent } from '@/features/components/model';
import { componentsApi } from '@/lib/api';
import {
  mapComponentDetailFromApi,
  type ComponentDocumentRecord,
} from '@/features/components/mappers';
import { isConnectionApiError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { useVisibilityPolling } from '@/features/shared/hooks/useVisibilityPolling';
import { useComponentRealtime } from '@/features/components/realtime/useComponentRealtime';

export type { ComponentDocumentRecord };

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
        const response = await componentsApi.getById(componentId);
        const detail = mapComponentDetailFromApi(response.data);

        setComponent(detail.component);
        if (!silent) {
          setIsLoading(false);
        }

        logger.debug('Eventos cargados', {
          total: detail.events.length,
          eventosConFotos: detail.events.filter((event) => event.fotos && event.fotos.length > 0).length,
        });

        setEvents(detail.events);
        setDocuments(detail.documents);
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
