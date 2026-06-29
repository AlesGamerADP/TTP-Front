'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ExternalLink } from 'lucide-react';
import { componentsApi } from '@/lib/api';
import { Button } from '../ui/button';
import { logger } from '@/lib/logger';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

type PdfMobileViewerProps = {
  url: string;
  docId: string | null;
};

export default function PdfMobileViewer({ url, docId }: PdfMobileViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(320);
  const [loadError, setLoadError] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsPreparing(true);
      setLoadError(false);
      setPdfData(null);
      setNumPages(0);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        if (buffer.byteLength === 0) throw new Error('PDF vacío');
        setPdfData(new Uint8Array(buffer));
      } catch (error: unknown) {
        logger.warn('Error leyendo PDF para visor móvil', {
          error: error instanceof Error ? error.message : error,
        });
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth || 320);
    };

    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(el);
    return () => observer.disconnect();
  }, [pdfData]);

  const openInNewTab = () => {
    const target = docId ? componentsApi.previewDocumentInline(docId) : url;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  if (loadError) {
    return (
      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No se pudo mostrar el PDF aquí. Ábrelo con el visor del navegador.
        </p>
        <Button type="button" variant="outline" onClick={openInNewTab}>
          <ExternalLink className="mr-2 size-4" />
          Abrir PDF
        </Button>
      </div>
    );
  }

  const pageWidth = Math.max(Math.floor(containerWidth) - 12, 260);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={containerRef}
        className="pdf-mobile-viewer min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted"
      >
        {isPreparing || !pdfData ? (
          <div className="flex min-h-[12rem] items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Renderizando documento…</p>
          </div>
        ) : (
          <Document
            file={{ data: pdfData }}
            onLoadSuccess={({ numPages: pages }) => {
              setNumPages(pages);
              setLoadError(false);
            }}
            onLoadError={(error) => {
              logger.warn('react-pdf no pudo cargar el documento', { error: String(error) });
              setLoadError(true);
            }}
            loading={
              <div className="flex min-h-[12rem] items-center justify-center p-6">
                <p className="text-sm text-muted-foreground">Cargando páginas…</p>
              </div>
            }
          >
            {numPages > 0 &&
              Array.from({ length: numPages }, (_, index) => (
                <div
                  key={`page-${index + 1}`}
                  className="flex justify-center py-2 first:pt-3 last:pb-4"
                >
                  <Page
                    pageNumber={index + 1}
                    width={pageWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-sm"
                  />
                </div>
              ))}
          </Document>
        )}
      </div>
      <div className="preview-dialog-footer-zone pdf-mobile-viewer-actions shrink-0 border-t bg-background px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full"
          onClick={openInNewTab}
        >
          <ExternalLink className="mr-2 size-4 shrink-0" />
          Abrir con visor del navegador
        </Button>
      </div>
    </div>
  );
}
