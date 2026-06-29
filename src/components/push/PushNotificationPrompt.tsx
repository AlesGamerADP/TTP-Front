'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Bell, BellOff } from 'lucide-react';
import { registerPushNotifications } from '@/lib/push-notifications';

export function PushNotificationPrompt() {
  const [supported, setSupported] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    const isDone = typeof window !== 'undefined' && Notification.permission === 'granted';

    requestAnimationFrame(() => {
      if (isSupported) setSupported(true);
      if (isDone) setDone(true);
    });
  }, []);

  if (!supported || done || Notification.permission === 'denied') {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
      <span className="text-muted-foreground">Recibe avisos cuando cambie el estado de un componente.</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void registerPushNotifications().then((ok) => {
            if (ok) setDone(true);
          });
        }}
      >
        <Bell className="mr-2 h-4 w-4" />
        Activar notificaciones
      </Button>
      {Notification.permission === 'default' && (
        <Button type="button" size="sm" variant="ghost" onClick={() => setDone(true)}>
          <BellOff className="mr-1 h-4 w-4" />
          Ahora no
        </Button>
      )}
    </div>
  );
}
