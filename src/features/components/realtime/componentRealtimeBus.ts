export type ComponentChangeAction = 'updated' | 'created' | 'deleted' | 'event_added';

export interface ComponentRealtimeEvent {
  type: 'component_change';
  action: ComponentChangeAction;
  componentId: string;
  companyId: string | null;
  changedBy?: string;
  at: string;
}

type Listener = (event: ComponentRealtimeEvent) => void;

const listeners = new Set<Listener>();

export function subscribeComponentRealtime(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishComponentRealtime(event: ComponentRealtimeEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Un listener fallido no debe cortar el resto
    }
  }
}
