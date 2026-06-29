import { componentsApi } from '@/lib/api';

export const EVENT_DOCUMENT_TYPE_PREFIX = 'event_attachment:';

export function extractEventIdFromDocumentType(documentType?: string | null): string | null {
  if (!documentType?.startsWith(EVENT_DOCUMENT_TYPE_PREFIX)) {
    return null;
  }

  const eventId = documentType.slice(EVENT_DOCUMENT_TYPE_PREFIX.length).trim();
  return eventId || null;
}

export function formatEventDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES');
}

export function truncateFileName(name: string, maxLength = 28): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
}

export function resolveEventPhotoUrls(
  fotos: string[],
  size: 'thumb' | 'medium' | 'full' = 'full',
): string[] {
  return fotos
    .map((photo) =>
      componentsApi.getPhotoUrl(typeof photo === 'string' ? photo : String(photo), { size }),
    )
    .filter((url) => url.length > 0);
}

export function displayFileName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
  if (!cleaned || /â/.test(cleaned)) {
    return 'Documento.pdf';
  }
  return cleaned;
}
