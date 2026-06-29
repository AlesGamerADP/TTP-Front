'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { fetchPdfPreviewObjectUrl } from '@/lib/pdf-preview';
import type { ComponentDocumentRecord } from '@/features/components/hooks/useComponentDetailData';
import { displayFileName } from '@/features/components/utils/detail-utils';

export function useComponentDetailPreviews() {
  const toast = useToast();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);
  const [previewDocOpen, setPreviewDocOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const closeImagePreview = () => {
    previewImages.forEach((url) => {
      if (url?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignorar errores al revocar
        }
      }
    });
    setPreviewImage(null);
    setPreviewImages([]);
    setPreviewIndex(0);
  };

  const closeDocPreview = () => {
    if (previewDoc?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewDoc);
      } catch {
        // Ignorar errores al revocar
      }
    }
    setPreviewDoc(null);
    setPreviewDocName(null);
    setPreviewDocOpen(false);
    setPreviewDocId(null);
    setIsLoadingPreview(false);
  };

  const openPdfPreview = async (doc: ComponentDocumentRecord, fileName: string) => {
    setPreviewDocName(displayFileName(fileName));
    setPreviewDocId(doc.id);
    setPreviewDocOpen(true);
    setIsLoadingPreview(true);
    setPreviewDoc(null);

    try {
      const blobUrl = await fetchPdfPreviewObjectUrl(doc);
      setPreviewDoc(blobUrl);
    } catch (error: unknown) {
      closeDocPreview();
      toast.error(
        'Error al cargar PDF',
        error instanceof Error ? error.message : 'No se pudo cargar el documento',
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return {
    previewImage,
    setPreviewImage,
    previewImages,
    setPreviewImages,
    previewIndex,
    setPreviewIndex,
    previewDoc,
    previewDocName,
    previewDocOpen,
    previewDocId,
    isLoadingPreview,
    closeImagePreview,
    closeDocPreview,
    openPdfPreview,
  };
}
