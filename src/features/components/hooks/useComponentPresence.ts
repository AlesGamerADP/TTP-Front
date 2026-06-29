'use client';

import { useCallback, useEffect, useState } from 'react';
import { componentsApi } from '@/lib/api';
import { subscribeComponentRealtime, type ComponentRealtimeEvent } from '../realtime/componentRealtimeBus';

export function useComponentPresence(componentId: string | undefined, enabled: boolean) {
  const [viewers, setViewers] = useState<{ userId: string; name: string }[]>([]);

  const applyPresence = useCallback((event: ComponentRealtimeEvent) => {
    if (event.type !== 'presence_update' || event.componentId !== componentId) return;
    setViewers(event.viewers ?? []);
  }, [componentId]);

  useEffect(() => {
    if (!enabled || !componentId) return;

    const ping = () => {
      void componentsApi.touchPresence(componentId).catch(() => undefined);
    };

    ping();
    const interval = setInterval(ping, 25_000);

    const unsub = subscribeComponentRealtime(applyPresence);

    return () => {
      clearInterval(interval);
      unsub();
      void componentsApi.leavePresence(componentId).catch(() => undefined);
    };
  }, [applyPresence, componentId, enabled]);

  return viewers;
}
