import { componentsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { ComponentDocumentRecord } from '@/features/components/hooks/useComponentDetailData';

function asPdfBlob(blob: Blob): Blob {
  if (blob.type === 'application/pdf') return blob;
  return new Blob([blob], { type: 'application/pdf' });
}

async function fetchDocumentBlob(docId: string): Promise<Blob> {
  const url = componentsApi.downloadDocument(docId);
  const response = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return asPdfBlob(await response.blob());
}

/** Blob URL para el visor PDF (no usar URL /download directamente en iframe). */
export async function fetchPdfPreviewObjectUrl(doc: ComponentDocumentRecord): Promise<string> {
  const fileUrl = doc.file_url?.trim();
  if (fileUrl?.startsWith('http://') || fileUrl?.startsWith('https://')) {
    try {
      const response = await fetch(fileUrl);
      if (response.ok) {
        return URL.createObjectURL(asPdfBlob(await response.blob()));
      }
    } catch (error: unknown) {
      logger.warn('PDF desde file_url no disponible, usando API', {
        docId: doc.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  const blob = await fetchDocumentBlob(doc.id);
  return URL.createObjectURL(blob);
}
