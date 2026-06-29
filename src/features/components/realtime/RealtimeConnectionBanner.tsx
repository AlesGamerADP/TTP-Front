'use client';

import { subscribeRealtimeConnection } from './realtimeConnectionBus';

import { useEffect, useState } from 'react';

export function RealtimeConnectionBanner() {
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => subscribeRealtimeConnection(setReconnecting), []);

  if (!reconnecting) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-2 text-sm text-amber-950 shadow-md dark:bg-amber-950/90 dark:text-amber-50"
      role="status"
    >
      Reconectando actualizaciones en vivo…
    </div>
  );
}
