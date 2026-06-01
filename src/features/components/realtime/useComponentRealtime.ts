'use client';

import { useEffect, useRef } from 'react';
import {
  subscribeComponentRealtime,
  type ComponentRealtimeEvent,
} from './componentRealtimeBus';

export interface UseComponentRealtimeOptions {
  enabled?: boolean;
  /** Si se indica, solo invoca el callback para ese componente. */
  componentId?: string;
  onEvent: (event: ComponentRealtimeEvent) => void;
}

export function useComponentRealtime({
  enabled = true,
  componentId,
  onEvent,
}: UseComponentRealtimeOptions): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    return subscribeComponentRealtime((event) => {
      if (componentId && event.componentId !== componentId) {
        return;
      }
      onEventRef.current(event);
    });
  }, [enabled, componentId]);
}
