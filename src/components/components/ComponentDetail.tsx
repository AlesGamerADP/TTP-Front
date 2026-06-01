'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { ProgressTimeline } from './ProgressTimeline';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ComponentDetailSkeleton } from '../common/LoadingStates';
import { Skeleton } from '../ui/skeleton';
import { useIsMobile } from '../ui/use-mobile';
import dynamic from 'next/dynamic';

// Lazy load componentes pesados - solo se cargan cuando se necesitan
const TimelineManager = dynamic(() => import('@/features/components/views/TimelineManagerView'), {
  loading: () => <div className="p-4 text-center text-sm text-muted-foreground">Cargando editor...</div>,
  ssr: false
});
import {
  ArrowLeft,
  Calendar,
  FileText,
  Download,
  Eye,
  Camera,
  Clock,
  Package,
  Trash2,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import {
  type User,
} from '../../lib/auth';
import { componentsApi } from '../../lib/api';
import { getComponentStatusBadgeClass } from '../../lib/component-status-style';
import { logger } from '../../lib/logger';
import { useRoleAccess } from '@/features/auth/hooks/useRoleAccess';
import { useComponentDetailActions } from '@/features/components/hooks/useComponentDetailActions';
import { STATUS_LABELS, groupEventsByStatus, type ComponentEvent } from '@/features/components/model';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  useComponentDetailData,
  type ComponentDocumentRecord,
} from '@/features/components/hooks/useComponentDetailData';

interface ComponentDetailProps {
  componentId: string;
  currentUser: User;
  onBack: () => void;
}

const EVENT_DOCUMENT_TYPE_PREFIX = 'event_attachment:';

function extractEventIdFromDocumentType(documentType?: string | null): string | null {
  if (!documentType?.startsWith(EVENT_DOCUMENT_TYPE_PREFIX)) {
    return null;
  }

  const eventId = documentType.slice(EVENT_DOCUMENT_TYPE_PREFIX.length).trim();
  return eventId || null;
}

function formatEventDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES');
}

function truncateFileName(name: string, maxLength = 28): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
}

function resolveEventPhotoUrls(fotos: string[]): string[] {
  return fotos
    .map((photo) =>
      componentsApi.getPhotoUrl(typeof photo === 'string' ? photo : String(photo), { size: 'full' }),
    )
    .filter((url) => url.length > 0);
}

function displayFileName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
  if (!cleaned || /â/.test(cleaned)) {
    return 'Documento.pdf';
  }
  return cleaned;
}

function asPdfBlob(blob: Blob): Blob {
  if (blob.type === 'application/pdf') {
    return blob;
  }
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

/** Blob URL para el visor: nunca usar la URL /download en iframe (dispara descarga). */
async function fetchPdfPreviewObjectUrl(doc: ComponentDocumentRecord): Promise<string> {
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

export const ComponentDetail = memo(function ComponentDetail({ componentId, currentUser, onBack }: ComponentDetailProps) {
  const toast = useToast();
  const isMobileViewport = useIsMobile();
  const {
    component,
    events,
    documents,
    isLoading,
    isLoadingDetails,
    reload,
  } = useComponentDetailData(componentId);

  useEffect(() => {
    if (!isLoading && !component) {
      onBack();
    }
  }, [component, isLoading, onBack]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Estados para previsualización de imágenes
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);


  // Estados para previsualización de documentos
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

  const relatedDocsByEvent = useMemo(() => {
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
      let targetEventId = extractEventIdFromDocumentType(doc.document_type);

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

  const access = useRoleAccess(currentUser?.role);
  const canEditTimeline = access.canEditTimeline;
  const canDelete = access.canEditTimeline;
  const {
    handleDelete,
    handleEventAdded,
    handleStatusUpdated,
    isDeleting,
  } = useComponentDetailActions({ componentId, reload, onBack });

  if (isLoading || !component) {
    return <ComponentDetailSkeleton />;
  }

  const sortedEvents = Array.isArray(events) ? [...events].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) : [];
  const groupedEvents = groupEventsByStatus(Array.isArray(events) ? events : []);

  const renderEventAttachments = (event: ComponentEvent) => {
    const relatedDocs = relatedDocsByEvent.get(event.id) ?? [];
    const hasFotos = Boolean(event.fotos?.length);
    const hasDocs = relatedDocs.length > 0 || event.archivos.length > 0;

    if (!hasFotos && !hasDocs) {
      return null;
    }

    return (
      <div className={`event-attachments ${isMobileViewport ? 'event-attachments--mobile' : ''}`}>
        {hasFotos && (
          <Button
            variant="outline"
            size="sm"
            className="event-resource-button h-8 min-w-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const photoUrls = resolveEventPhotoUrls(event.fotos);
              if (photoUrls.length > 0) {
                setPreviewImages(photoUrls);
                setPreviewImage(photoUrls[0]);
                setPreviewIndex(0);
                return;
              }

              toast.error(
                'Error al cargar imágenes',
                'No se pudieron resolver las URLs de las fotos.',
              );
            }}
          >
            <Eye className="mr-2 h-4 w-4 shrink-0" />
            {event.fotos.length} {event.fotos.length === 1 ? 'foto' : 'fotos'}
          </Button>
        )}

        {relatedDocs.map((doc, idx) => {
          const fileName = doc.file_name || `archivo-${idx + 1}`;
          const isPdf = fileName.toLowerCase().endsWith('.pdf');

          return (
            <Button
              key={doc.id}
              variant="outline"
              size="sm"
              className="event-resource-button h-8 min-w-0 overflow-hidden"
              style={isMobileViewport ? undefined : { maxWidth: '14rem' }}
              title={fileName}
              onClick={async () => {
                if (isPdf) {
                  await openPdfPreview(doc, fileName);
                } else {
                  try {
                    await componentsApi.downloadDocumentWithFetch(doc.id, fileName);
                  } catch (error: unknown) {
                    toast.error(
                      'Error al descargar',
                      error instanceof Error ? error.message : 'No se pudo descargar el archivo',
                    );
                  }
                }
              }}
            >
              {isPdf ? (
                <Eye className="mr-2 h-4 w-4 shrink-0" />
              ) : (
                <Download className="mr-2 h-4 w-4 shrink-0" />
              )}
              <span className="event-resource-button__label">
                {truncateFileName(fileName, isMobileViewport ? 22 : 28)}
              </span>
            </Button>
          );
        })}

        {event.archivos.map((archivo, idx) => (
          <Button
            key={`legacy-${idx}`}
            variant="outline"
            size="sm"
            className="event-resource-button h-8 min-w-0 overflow-hidden"
            style={isMobileViewport ? undefined : { maxWidth: '14rem' }}
            title={archivo}
          >
            <FileText className="mr-2 h-4 w-4 shrink-0" />
            <span className="event-resource-button__label">
              {truncateFileName(archivo, isMobileViewport ? 22 : 28)}
            </span>
            <Download className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        ))}
      </div>
    );
  };

  const renderEventHistoryCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Eventos</CardTitle>
        <div className="mt-2 text-xs text-muted-foreground">
          Total eventos: {sortedEvents.length} |
          Eventos con fotos: {sortedEvents.filter(e => e.fotos && e.fotos.length > 0).length}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isMobileViewport ? 'details' : 'timeline'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-0 mt-6">
            {isLoadingDetails ? (
              <div className="space-y-4 py-4" aria-busy="true" aria-label="Cargando historial">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay eventos registrados</p>
              </div>
            ) : (
              <div className="relative">
                <div className="timeline-track-line absolute bottom-0 left-4 top-0 w-0.5 sm:left-6" />
                {sortedEvents.map((event, index) => {
                  const isFirst = index === 0;
                  return (
                    <div key={event.id} className="relative flex items-start pb-6 sm:pb-8">
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full sm:h-12 sm:w-12 ${isFirst ? 'bg-blue-600' : 'timeline-dot-inactive'} border-4 border-background shadow-md`}
                        >
                          {isFirst ? (
                            <CheckCircle2 className="h-4 w-4 text-white sm:h-6 sm:w-6" />
                          ) : (
                            <Circle className="h-4 w-4 text-white sm:h-6 sm:w-6" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1 pb-4 sm:ml-10">
                        <Card className="min-w-0 shadow-sm">
                          <CardContent className="event-detail-card-content pt-4">
                            <div className="mb-3 mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div
                                className={
                                  isMobileViewport
                                    ? 'flex flex-col items-start gap-2'
                                    : 'flex flex-wrap items-center gap-2'
                                }
                              >
                                <Badge className={getComponentStatusBadgeClass(event.estado)}>
                                  {STATUS_LABELS[event.estado]}
                                </Badge>
                                {isFirst && (
                                  <Badge
                                    variant="outline"
                                    className="event-meta-badge font-normal rounded-sm"
                                  >
                                    Más reciente
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground sm:text-sm">
                                <Calendar className="mr-1 h-4 w-4 shrink-0" />
                                {new Date(event.created_at).toLocaleString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            {event.nota && (
                              <p className="event-note-text mb-3 rounded-md bg-muted p-3 text-sm text-foreground">
                                {event.nota}
                              </p>
                            )}
                            {renderEventAttachments(event)}
                            {!isMobileViewport && (
                              <>
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    {event.archivos.length > 0 && (
                                      <div className="flex items-center">
                                        <FileText className="w-4 h-4 mr-1" />
                                        {event.archivos.length}{' '}
                                        {event.archivos.length === 1 ? 'archivo' : 'archivos'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-4">
                                  {event.fotos?.length > 0 && (
                                    <span className="flex items-center text-sm text-muted-foreground">
                                      <Camera className="w-3 h-3 mr-1" />
                                      {event.fotos.length}
                                    </span>
                                  )}
                                  {(() => {
                                    const relatedDocs = relatedDocsByEvent.get(event.id) ?? [];
                                    const totalDocs = relatedDocs.length + event.archivos.length;
                                    if (totalDocs > 0) {
                                      return (
                                        <span className="flex items-center text-sm text-muted-foreground">
                                          <FileText className="w-3 h-3 mr-1" />
                                          {totalDocs}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {isLoadingDetails ? (
              <div className="space-y-4" aria-busy="true">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : groupedEvents.map((group) => {
              const isMulti = group.events.length > 1;
              const singleEvent = group.events[0];
              return (
                <Card key={group.estado} className="min-w-0">
                  <CardContent className="event-detail-card-content pt-6">
                    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                        <Badge className={getComponentStatusBadgeClass(group.estado)}>
                          {STATUS_LABELS[group.estado]}
                        </Badge>
                        <div className="flex min-w-0 items-center text-xs text-muted-foreground sm:text-sm">
                          <Clock className="mr-1 h-4 w-4 shrink-0" />
                          <span>
                            {formatEventDateTime(isMulti ? group.latestAt : singleEvent.created_at)}
                          </span>
                        </div>
                      </div>
                      {isMulti && (
                        <Badge
                          variant="outline"
                          className="event-meta-badge w-fit rounded-sm font-normal"
                        >
                          {group.events.length} actualizaciones
                        </Badge>
                      )}
                    </div>
                    {isMulti ? (
                      <div className="space-y-3">
                        {group.events.map((event) => (
                          <div
                            key={event.id}
                            className="event-update-subcard min-w-0 rounded-lg px-4 py-3"
                          >
                            <div
                              className={
                                event.nota
                                  ? isMobileViewport
                                    ? 'mb-2 flex flex-col gap-1'
                                    : 'mb-2 flex items-start justify-between gap-3'
                                  : 'mb-2 flex justify-end'
                              }
                            >
                              {event.nota ? (
                                <p className="event-note-text min-w-0 flex-1 text-sm text-foreground">
                                  {event.nota}
                                </p>
                              ) : null}
                              <time
                                dateTime={event.created_at}
                                className="shrink-0 text-[11px] leading-4 text-muted-foreground tabular-nums"
                              >
                                {formatEventDateTime(event.created_at)}
                              </time>
                            </div>
                            {renderEventAttachments(event)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {singleEvent.nota ? (
                          <p className="event-note-text mb-3 min-w-0 text-sm">{singleEvent.nota}</p>
                        ) : null}
                        {renderEventAttachments(singleEvent)}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  return (
    <div className="app-shell min-h-screen">
      {/* Header */}
      <header className="app-subheader sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isMobileViewport ? (
            <div className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-3">
                <Button variant="ghost" size="sm" onClick={onBack} className="back-nav-button -ml-2 w-fit shrink-0 px-2">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <div className="flex items-center gap-2 shrink-0">
                  <ThemeToggle />
                  <Badge
                    className={`${getComponentStatusBadgeClass(component.estado)} mt-0.5 max-w-[11rem] shrink-0 whitespace-normal rounded-lg px-3 py-1 text-[11px] text-center`}
                  >
                    {STATUS_LABELS[component.estado]}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl font-semibold leading-tight break-words">
                  {component.modelo}
                </h1>
                <p className="text-sm text-muted-foreground break-all">
                  Serie: {component.serial}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="header-action-button header-action-button--danger mt-1 w-full justify-center font-medium h-9 rounded-md text-sm"
                    onClick={() => setShowDeleteDialog(true)}
                    aria-label="Eliminar componente"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Eliminar componente
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-16 items-center justify-between py-3">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Button variant="ghost" size="sm" onClick={onBack} className="back-nav-button shrink-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold leading-tight break-words">
                    {component.modelo}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground break-all sm:break-words">
                    Serie: {component.serial}
                  </p>
                </div>
              </div>

              <div className="component-detail-header-actions">
                <ThemeToggle />
                <Badge
                  className={`${getComponentStatusBadgeClass(component.estado)} max-w-full whitespace-normal rounded-lg px-3 py-1 text-sm`}
                >
                  {STATUS_LABELS[component.estado]}
                </Badge>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="header-action-button header-action-button--danger shrink-0 font-medium px-3 py-2 h-9 rounded-md text-sm"
                    onClick={() => setShowDeleteDialog(true)}
                    aria-label="Eliminar componente"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          )}

          <ConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={async () => {
              setShowDeleteDialog(false);
              await handleDelete();
            }}
            title="¿Eliminar componente?"
            description={`Esta acción no se puede deshacer. Se eliminará permanentemente el componente ${component.serial} (${component.modelo}) y todos sus datos asociados, incluyendo documentos y eventos del historial.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
            variant="destructive"
            isLoading={isDeleting}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Component Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-5 w-5 shrink-0" />
                  Información del Componente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                    <p className="text-base break-words">{component.modelo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Número de Serie</label>
                    <p className="text-base break-all sm:break-words">{component.serial}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</label>
                    <p className="flex items-center text-base break-words">
                      <Calendar className="mr-2 h-4 w-4 shrink-0" />
                      {new Date(component.fecha_ingreso).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado Actual</label>
                    <p className="text-base break-words">{STATUS_LABELS[component.estado]}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ITE</label>
                    <p className="text-base font-medium break-words">{component.ite || 'No especificado'}</p>
                  </div>
                  {component.numero_cotizacion && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Número de Cotización</label>
                      <p className="text-base font-medium break-all sm:break-words">{component.numero_cotizacion}</p>
                    </div>
                  )}
                </div>

                {component.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
                    <p className="text-base break-words whitespace-pre-wrap">{component.observaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isMobileViewport && renderEventHistoryCard()}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressTimeline currentStatus={component.estado} />
              </CardContent>
            </Card>

            {/* Timeline Manager - Solo admin puede editar */}
            {canEditTimeline && (
              <TimelineManager
                componentId={componentId}
                currentUser={currentUser}
                events={events}
                documents={documents}
                currentStatus={component.estado}
                onEventAdded={handleEventAdded}
                onStatusUpdated={handleStatusUpdated}
              />
            )}
          </div>

          {/* Historial de Eventos — móvil: al final */}
          {isMobileViewport && renderEventHistoryCard()}
        </div>
      </main>

      {/* Dialog para previsualizar imágenes */}
      {previewImage && (
        <Dialog 
          open={!!previewImage} 
          onOpenChange={(open) => {
            if (!open) closeImagePreview();
          }}
        >
          <DialogContent
            hideCloseButton
            className="w-[calc(100vw-2rem)] sm:w-[calc(100vw-3rem)] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-6xl h-[90vh] sm:h-[85vh] max-h-[95vh] overflow-hidden p-0 m-1 sm:m-2 flex flex-col"
            style={
              isMobileViewport
                ? {
                    width: 'calc(100vw - 1rem)',
                    height: '94vh',
                    maxHeight: '96vh',
                    margin: '0.25rem',
                  }
                : undefined
            }
          >
            <DialogHeader className="flex flex-row items-start gap-3 px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b text-left">
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-sm sm:text-base md:text-lg font-semibold">
                  Foto {previewIndex + 1} de {previewImages.length}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Visualización de imagen del evento
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="preview-dialog-close shrink-0"
                onClick={closeImagePreview}
                aria-label="Cerrar vista previa"
              >
                <X className="size-5" />
              </Button>
            </DialogHeader>
            <div className="preview-media-bg relative flex flex-1 items-center justify-center overflow-hidden" style={{ minHeight: 0 }}>
              {previewImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="preview-nav-button absolute left-1 sm:left-2 md:left-4 z-10 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shadow-md"
                    onClick={() => {
                      const newIndex = previewIndex > 0 ? previewIndex - 1 : previewImages.length - 1;
                      setPreviewIndex(newIndex);
                      setPreviewImage(previewImages[newIndex]);
                    }}
                    aria-label="Imagen anterior"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="preview-nav-button absolute right-1 sm:right-2 md:right-4 z-10 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shadow-md"
                    onClick={() => {
                      const newIndex = previewIndex < previewImages.length - 1 ? previewIndex + 1 : 0;
                      setPreviewIndex(newIndex);
                      setPreviewImage(previewImages[newIndex]);
                    }}
                    aria-label="Imagen siguiente"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
                  </Button>
                </>
              )}
              <div className="flex items-center justify-center w-full h-full p-2 sm:p-4 md:p-6 overflow-auto">
                {previewImage ? (
                  <div className="relative w-full h-full flex items-center justify-center min-h-0">
                    <img
                      src={previewImage}
                      alt={`Foto ${previewIndex + 1}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded shadow-lg"
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: isMobileViewport ? 'calc(94vh - 130px)' : 'calc(90vh - 140px)',
                        width: 'auto',
                        height: 'auto'
                      }}
                      onError={(e) => {
                        const errorInfo: Record<string, any> = {
                          index: previewIndex,
                          hasPreviewImage: !!previewImage,
                          previewImageType: previewImage?.startsWith('blob:') ? 'blob' : 
                                          previewImage?.startsWith('data:') ? 'data' : 'other',
                        };
                        
                        if (previewImage) {
                          try {
                            if (previewImage.startsWith('blob:')) {
                              errorInfo.previewImageLength = previewImage.length;
                            } else {
                              errorInfo.previewImagePreview = previewImage.substring(0, 50) + '...';
                            }
                          } catch {
                            errorInfo.previewImage = 'N/A';
                          }
                        }
                        
                        logger.error('Error cargando imagen en preview', errorInfo);
                        toast.error('Error al cargar imagen', 'No se pudo mostrar la imagen');
                      }}
                      onLoad={() => {
                        logger.debug('Imagen cargada en preview', { index: previewIndex });
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>Cargando imagen...</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 pt-2 sm:pt-3 flex-shrink-0 border-t bg-background">
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 w-full sm:w-auto text-xs sm:text-sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewImage || '';
                  link.download = `foto-${previewIndex + 1}.jpg`;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Descargar Foto</span>
                <span className="sm:hidden">Descargar</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para previsualizar documentos */}
      {previewDocOpen && (
        <Dialog open={previewDocOpen} onOpenChange={(open) => {
          if (!open) closeDocPreview();
        }}>
          <DialogContent
            hideCloseButton
            className="preview-doc-dialog !flex !max-w-[min(96vw,80rem)] w-[min(calc(100vw-1.25rem),96vw)] sm:w-[min(calc(100vw-2rem),94vw)] md:w-[min(90vw,76rem)] h-[90vh] sm:h-[92vh] md:h-[95vh] max-h-[98vh] overflow-hidden p-0 m-1 sm:m-2 flex-col"
            style={
              isMobileViewport
                ? {
                    width: 'calc(100vw - 1rem)',
                    maxWidth: 'calc(100vw - 1rem)',
                    margin: '0.25rem',
                  }
                : undefined
            }
          >
            <DialogHeader className="flex flex-row items-start gap-3 px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 md:pt-6 pb-3 flex-shrink-0 border-b text-left">
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-base sm:text-lg md:text-xl font-semibold line-clamp-2">
                  {previewDocName || 'Documento'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm md:text-base">
                  Visualización de documento PDF
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="preview-dialog-close shrink-0"
                onClick={closeDocPreview}
                aria-label="Cerrar documento"
              >
                <X className="size-5" />
              </Button>
            </DialogHeader>
            <div
              className="preview-doc-bg flex-1 w-full overflow-hidden"
              style={{
                minHeight: 0,
                height: 'calc(95vh - 160px)',
                flex: '1 1 auto',
              }}
            >
              {isLoadingPreview ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando documento...</p>
                  </div>
                </div>
              ) : previewDoc ? (
                <iframe
                  src={`${previewDoc}#navpanes=0&view=FitH`}
                  className="w-full h-full border-0"
                  title="Document Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '500px',
                    display: 'block',
                    border: 'none',
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  No se pudo obtener la URL del documento.
                </div>
              )}
            </div>
            <DialogFooter className="px-4 sm:px-6 md:px-8 pt-3 sm:pt-4 pb-5 sm:pb-7 md:pb-8 flex-shrink-0 border-t bg-background safe-area-pb sm:justify-end">
              <Button
                size="sm"
                onClick={closeDocPreview}
                className="h-9 w-full max-w-[10rem] sm:w-auto sm:max-w-none sm:ml-auto px-4 py-2 mb-1 sm:mb-0"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});