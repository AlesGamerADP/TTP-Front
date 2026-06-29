type Listener = (reconnecting: boolean) => void;

const listeners = new Set<Listener>();

export function subscribeRealtimeConnection(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRealtimeReconnecting(reconnecting: boolean): void {
  for (const listener of listeners) {
    listener(reconnecting);
  }
}
