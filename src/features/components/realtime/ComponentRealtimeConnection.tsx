'use client';

import { useEffect, useRef, useState } from 'react';
import { getCurrentSessionUser } from '@/features/auth/session';
import { useAuthStore } from '@/store/auth-store';
import { invalidateComponentDataCaches } from '@/lib/data-service';
import { logger } from '@/lib/logger';
import {
  publishComponentRealtime,
  type ComponentRealtimeEvent,
} from './componentRealtimeBus';
import { getComponentStreamUrl } from './componentStreamUrl';
import { setRealtimeReconnecting } from './realtimeConnectionBus';

const MIN_RECONNECT_MS = 2_000;
const MAX_RECONNECT_MS = 60_000;
const MAX_AUTH_FAILURES = 3;

function parseRealtimeEvent(raw: string): ComponentRealtimeEvent | null {
  try {
    const data = JSON.parse(raw) as ComponentRealtimeEvent;
    if (!data?.componentId) return null;
    if (data.type === 'presence_update' || data.action === 'presence_update') {
      return { ...data, type: 'presence_update', action: 'presence_update' };
    }
    if (data.type !== 'component_change') return null;
    return data;
  } catch {
    return null;
  }
}

export function ComponentRealtimeConnection() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const userIdRef = useRef<string | undefined>(undefined);
  const userId = useAuthStore((state) => state.user?.id);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(MIN_RECONNECT_MS);
  const authFailuresRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    void getCurrentSessionUser()
      .then((currentUser) => {
        if (cancelled) return;
        if (currentUser) {
          setUser(currentUser);
          setHasSession(true);
        } else {
          setHasSession(false);
        }
      })
      .catch(() => {
        if (!cancelled) setHasSession(false);
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const shouldConnect = sessionChecked && (hasSession || isAuthenticated);

  useEffect(() => {
    if (!shouldConnect) {
      sourceRef.current?.close();
      sourceRef.current = null;
      authFailuresRef.current = 0;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimerRef.current) return;
      if (authFailuresRef.current >= MAX_AUTH_FAILURES) {
        logger.debug('SSE: sesión inválida, no se reintenta');
        return;
      }

      const delay = backoffRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (!cancelled) {
          connect();
        }
      }, delay);
      backoffRef.current = Math.min(delay * 2, MAX_RECONNECT_MS);
    };

    const connect = () => {
      if (cancelled) return;

      sourceRef.current?.close();

      const url = getComponentStreamUrl();
      const source = new EventSource(url, { withCredentials: true });
      sourceRef.current = source;

      source.addEventListener('open', () => {
        backoffRef.current = MIN_RECONNECT_MS;
        authFailuresRef.current = 0;
        setRealtimeReconnecting(false);
        logger.debug('SSE componentes conectado');
      });

      source.onmessage = (message) => {
        const event = parseRealtimeEvent(message.data);
        if (!event) return;

        if (event.type === 'presence_update') {
          publishComponentRealtime(event);
          return;
        }

        const userId = userIdRef.current;
        if (event.changedBy && userId && event.changedBy === userId) {
          return;
        }

        invalidateComponentDataCaches();
        publishComponentRealtime(event);
      };

      source.onerror = () => {
        setRealtimeReconnecting(true);
        source.close();
        if (sourceRef.current === source) {
          sourceRef.current = null;
        }

        void getCurrentSessionUser()
          .then((currentUser) => {
            if (cancelled) return;
            if (!currentUser) {
              authFailuresRef.current = MAX_AUTH_FAILURES;
              setHasSession(false);
              logger.debug('SSE: sin sesión activa');
              return;
            }
            authFailuresRef.current = 0;
            logger.debug('SSE componentes desconectado, reintentando…');
            scheduleReconnect();
          })
          .catch(() => {
            authFailuresRef.current += 1;
            if (authFailuresRef.current < MAX_AUTH_FAILURES) {
              scheduleReconnect();
            }
          });
      };
    };

    connect();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      sourceRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [shouldConnect, setUser]);

  return null;
}
