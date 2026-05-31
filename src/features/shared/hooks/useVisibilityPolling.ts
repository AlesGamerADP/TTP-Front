'use client';

import { useEffect } from 'react';

interface UseVisibilityPollingOptions {
  enabled?: boolean;
  visibleIntervalMs?: number;
  hiddenIntervalMs?: number;
  runOnMount?: boolean;
  refreshOnFocus?: boolean;
}

export function useVisibilityPolling(
  callback: () => void | Promise<void>,
  {
    enabled = true,
    visibleIntervalMs = 120000,
    hiddenIntervalMs = 300000,
    runOnMount = false,
    refreshOnFocus = true,
  }: UseVisibilityPollingOptions = {},
) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearCurrentInterval = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const schedulePolling = () => {
      clearCurrentInterval();
      const intervalMs = document.hidden ? hiddenIntervalMs : visibleIntervalMs;
      intervalId = setInterval(() => {
        void callback();
      }, intervalMs);
    };

    const handleVisibilityChange = () => {
      schedulePolling();
      if (!document.hidden && refreshOnFocus) {
        void callback();
      }
    };

    const handleWindowFocus = () => {
      if (refreshOnFocus) {
        void callback();
      }
    };

    if (runOnMount) {
      void callback();
    }

    schedulePolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (refreshOnFocus) {
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      clearCurrentInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshOnFocus) {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [callback, enabled, hiddenIntervalMs, refreshOnFocus, runOnMount, visibleIntervalMs]);
}
