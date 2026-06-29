export type ComponentChangeAction =
  | 'updated'
  | 'created'
  | 'deleted'
  | 'event_added'
  | 'event_updated'
  | 'document_deleted'
  | 'presence_update';

export type ComponentChangeScope = 'list' | 'detail' | 'events';

export interface ComponentRealtimeEvent {
  type: 'component_change' | 'presence_update';
  action: ComponentChangeAction;
  componentId: string;
  companyId: string | null;
  changedBy?: string;
  at: string;
  eventId?: string;
  status?: string;
  scope?: ComponentChangeScope;
  viewers?: { userId: string; name: string }[];
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
