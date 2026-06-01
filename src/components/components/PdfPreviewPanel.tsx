'use client';

import dynamic from 'next/dynamic';
import { shouldUseCanvasPdfViewer } from '@/lib/pdf-device';

const PdfMobileViewer = dynamic(() => import('./PdfMobileViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[12rem] items-center justify-center">
      <p className="text-sm text-muted-foreground">Preparando visor…</p>
    </div>
  ),
});

type PdfPreviewPanelProps = {
  url: string;
  docId: string | null;
  isMobileViewport: boolean;
};

/**
 * Escritorio: iframe + blob.
 * Móvil (Android, iOS, emuladores): react-pdf (canvas). object/iframe con URL
 * suele fallar en WebView móvil aunque en PC funcione.
 */
export function PdfPreviewPanel({ url, docId, isMobileViewport }: PdfPreviewPanelProps) {
  if (!shouldUseCanvasPdfViewer(isMobileViewport)) {
    return (
      <iframe
        src={`${url}#navpanes=0&view=FitH`}
        className="h-full w-full min-h-[500px] border-0"
        title="Document Preview"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
          display: 'block',
          border: 'none',
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PdfMobileViewer url={url} docId={docId} />
    </div>
  );
}
