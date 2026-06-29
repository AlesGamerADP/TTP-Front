import { apiClient } from './api';
import { logger } from './logger';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function registerPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const { publicKey } = await apiClient.get<{ publicKey: string }>('/api/push/vapid-public-key');
    if (!publicKey) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = subscription.toJSON();
    await apiClient.post('/api/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
    });

    logger.info('Push notifications registradas');
    return true;
  } catch (error) {
    logger.debug('No se pudieron registrar push notifications', { error });
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const sub = await registration?.pushManager.getSubscription();
  if (sub) {
    await apiClient.delete(
      `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
    );
    await sub.unsubscribe();
  }
}
