'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Component, ComponentEvent, ComponentStatus } from '@/features/components/model';
import { componentsApi } from '@/lib/api';
import {
  mapComponentDetailFromApi,
  type ComponentDocumentRecord,
} from '@/features/components/mappers';
import { isConnectionApiError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/query-keys';
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

type DetailData = {
  component: Component;
  events: ComponentEvent[];
  documents: ComponentDocumentRecord[];
};

export function useComponentDetailData(componentId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.componentDetail(componentId);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await componentsApi.getById(componentId);
      const detail = mapComponentDetailFromApi(response.data);
      logger.debug('Eventos cargados', {
        total: detail.events.length,
        eventosConFotos: detail.events.filter((event) => event.fotos && event.fotos.length > 0).length,
      });
      return detail;
    },
    enabled: Boolean(componentId),
  });

  useEffect(() => {
    if (!error) return;
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (isConnectionApiError(error)) {
      logger.debug('Error de conexión al cargar datos del componente', { componentId, error: errorMessage });
    } else {
      logger.error('Error loading component data', { error, componentId });
    }
  }, [error, componentId]);

  const reload = useCallback(
    async (silent = false) => {
      if (silent) {
        await queryClient.invalidateQueries({ queryKey });
        return;
      }
      await refetch();
    },
    [queryClient, queryKey, refetch],
  );

  const applyOptimisticTimelineUpdate = useCallback(
    (payload: OptimisticTimelinePayload) => {
      queryClient.setQueryData<DetailData | undefined>(queryKey, (prev) => {
        if (!prev) return prev;

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

        return {
          ...prev,
          component: { ...prev.component, estado: payload.status },
          events: [optimisticEvent, ...prev.events],
        };
      });
    },
    [componentId, queryClient, queryKey],
  );

  const rollbackOptimisticTimelineUpdate = useCallback(
    (tempId: string) => {
      queryClient.setQueryData<DetailData | undefined>(queryKey, (prev) => {
        if (!prev) return prev;
        return { ...prev, events: prev.events.filter((event) => event.id !== tempId) };
      });
    },
    [queryClient, queryKey],
  );

  useVisibilityPolling(() => reload(true));

  useComponentRealtime({
    componentId,
    onEvent: (event) => {
      if (event.type === 'presence_update') return;
      if (event.scope === 'list' && event.action !== 'deleted' && event.action !== 'created') {
        return;
      }
      void reload(true);
    },
  });

  return {
    component: data?.component,
    events: data?.events ?? [],
    documents: data?.documents ?? [],
    isLoading: isLoading && !data,
    isLoadingDetails: isFetching && !data,
    reload,
    applyOptimisticTimelineUpdate,
    rollbackOptimisticTimelineUpdate,
  };
}
