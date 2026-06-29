'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { componentsApi } from '@/lib/api';
import { cn } from '../ui/utils';

type DocumentPdfThumbProps = {
  docId: string;
  fileName?: string;
  className?: string;
  onClick?: () => void;
};

export function DocumentPdfThumb({ docId, fileName, className, onClick }: DocumentPdfThumbProps) {
  const [failed, setFailed] = useState(false);
  const src = componentsApi.getDocumentThumbnailUrl(docId, 'thumb');

  if (failed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded border bg-muted shrink-0',
          className,
        )}
        title={fileName || 'PDF'}
        aria-label={fileName || 'Documento PDF'}
      >
        <FileText className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative h-12 w-12 overflow-hidden rounded border bg-muted shrink-0 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      title={fileName || 'Vista previa PDF'}
      aria-label={fileName ? `Miniatura ${fileName}` : 'Miniatura PDF'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-top"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </button>
  );
}
