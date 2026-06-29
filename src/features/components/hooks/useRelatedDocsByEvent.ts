'use client';

import { useMemo } from 'react';
import type { ComponentEvent } from '@/features/components/model';
import type { ComponentDocumentRecord } from '@/features/components/hooks/useComponentDetailData';
import { extractEventIdFromDocumentType } from '@/features/components/utils/detail-utils';

export function useRelatedDocsByEvent(
  events: ComponentEvent[],
  documents: ComponentDocumentRecord[],
): Map<string, ComponentDocumentRecord[]> {
  return useMemo(() => {
    const docsByEvent = new Map<string, ComponentDocumentRecord[]>();
    const eventDates = events
      .map((event) => ({
        id: event.id,
        timestamp: new Date(event.created_at).getTime(),
      }))
      .filter((event) => event.id && !Number.isNaN(event.timestamp));

    for (const event of events) {
      if (event.id) {
        docsByEvent.set(event.id, []);
      }
    }

    for (const doc of documents) {
      const targetEventId = extractEventIdFromDocumentType(doc.document_type);

      if (targetEventId && docsByEvent.has(targetEventId)) {
        docsByEvent.get(targetEventId)!.push(doc);
        continue;
      }

      const docTimestamp = new Date(doc.uploaded_at || doc.created_at || '').getTime();
      if (Number.isNaN(docTimestamp) || eventDates.length === 0) {
        continue;
      }

      let closestEventId: string | null = null;
      let closestDiff = Number.POSITIVE_INFINITY;

      for (const event of eventDates) {
        const diff = Math.abs(event.timestamp - docTimestamp);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestEventId = event.id;
        }
      }

      if (closestEventId && docsByEvent.has(closestEventId)) {
        docsByEvent.get(closestEventId)!.push(doc);
      }
    }

    return docsByEvent;
  }, [documents, events]);
}
