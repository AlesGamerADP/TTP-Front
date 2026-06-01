'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Component, ComponentEvent, ComponentStatus } from '@/features/components/model';
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

export interface OptimisticTimelinePayload {
  tempId: string;
  status: ComponentStatus;
  note?: string;
  photoPreviewUrls: string[];
  fileNames: string[];
  createdBy: string;
}

type DetailSnapshot = {
  component: Component | undefined;
  events: ComponentEvent[];
};

export function useComponentDetailData(componentId: string) {
  const [component, setComponent] = useState<Component | undefined>(undefined);
  const [events, setEvents] = useState<ComponentEvent[]>([]);
  const [documents, setDocuments] = useState<ComponentDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const optimisticSnapshotRef = useRef<DetailSnapshot | null>(null);

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
        optimisticSnapshotRef.current = null;
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

  const applyOptimisticTimelineUpdate = useCallback(
    (payload: OptimisticTimelinePayload) => {
      optimisticSnapshotRef.current = {
        component: component ? { ...component } : undefined,
        events: [...events],
      };

      const optimisticEvent: ComponentEvent = {
        id: payload.tempId,
        component_id: componentId,
        estado: payload.status,
        nota: payload.note,
        fotos: payload.photoPreviewUrls,
        archivos: payload.fileNames,
        created_by: payload.createdBy,
        created_at: new Date().toISOString(),
        pending: true,
      };

      setComponent((prev) => (prev ? { ...prev, estado: payload.status } : prev));
      setEvents((prev) => [optimisticEvent, ...prev]);
    },
    [component, componentId, events],
  );

  const rollbackOptimisticTimelineUpdate = useCallback((tempId: string) => {
    const snapshot = optimisticSnapshotRef.current;
    if (snapshot) {
      setComponent(snapshot.component);
      setEvents(snapshot.events);
    } else {
      setEvents((prev) => prev.filter((event) => event.id !== tempId));
    }
    optimisticSnapshotRef.current = null;
  }, []);

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
    applyOptimisticTimelineUpdate,
    rollbackOptimisticTimelineUpdate,
  };
}
