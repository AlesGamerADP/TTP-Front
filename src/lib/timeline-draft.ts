import { logger } from './logger';
import type { ComponentStatus } from '@/features/components/model';

const DB_NAME = 'ingetec-timeline-drafts';
const STORE = 'drafts';
const DB_VERSION = 1;

export interface TimelineDraftMeta {
  componentId: string;
  selectedStatus: ComponentStatus;
  eventNote: string;
  photoNames: string[];
  fileNames: string[];
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'componentId' });
      }
    };
  });
}

export async function saveTimelineDraft(
  componentId: string,
  meta: Omit<TimelineDraftMeta, 'componentId' | 'savedAt'>,
  files: File[],
): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({
      componentId,
      ...meta,
      savedAt: new Date().toISOString(),
      files,
    });
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch (error) {
    logger.debug('No se pudo guardar borrador timeline', { error, componentId });
  }
}

export async function loadTimelineDraft(
  componentId: string,
): Promise<{ meta: TimelineDraftMeta; files: File[] } | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    type StoredDraft = TimelineDraftMeta & { files?: File[] };
    const record = await new Promise<StoredDraft | undefined>((res, rej) => {
      const req = store.get(componentId);
      req.onsuccess = () => res(req.result as StoredDraft | undefined);
      req.onerror = () => rej(req.error);
    });
    db.close();
    if (!record) return null;
    return {
      meta: {
        componentId: record.componentId,
        selectedStatus: record.selectedStatus,
        eventNote: record.eventNote,
        photoNames: record.photoNames ?? [],
        fileNames: record.fileNames ?? [],
        savedAt: record.savedAt,
      },
      files: record.files ?? [],
    };
  } catch {
    return null;
  }
}

export async function clearTimelineDraft(componentId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(componentId);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
