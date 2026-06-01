'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';
import { useIsMobile } from '../ui/use-mobile';

import { 
  Plus, 
  Calendar, 
  Upload, 
  X, 
  CheckCircle2, 
  Clock,
  FileText,
  Camera,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import { logger } from '../../lib/logger';
import {
  type User,
  type ComponentStatus,
  type ComponentEvent,
  STATUS_LABELS,
  STATUS_ORDER,
  getNextStatus,
  canUpdateToStatus,
} from '../../lib/auth';
import { useRoleAccess } from '@/features/auth/hooks/useRoleAccess';
import { useUsersCatalog } from '@/features/users/hooks/useUsersCatalog';
import type { ComponentDocumentRecord } from '@/features/components/hooks/useComponentDetailData';
import { submitTimelineUpdate } from '@/features/components/use-cases/submitTimelineUpdate';

interface TimelineManagerProps {
  componentId: string;
  currentUser: User;
  events: ComponentEvent[];
  documents?: ComponentDocumentRecord[];
  onEventAdded: (event: ComponentEvent) => void;
  onStatusUpdated: (newStatus: ComponentStatus) => void;
  currentStatus: ComponentStatus;
}

export function TimelineManager({ 
  componentId, 
  currentUser,
  events, 
  documents = [],
  onEventAdded, 
  onStatusUpdated, 
  currentStatus 
}: TimelineManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showAllRecentEvents, setShowAllRecentEvents] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ComponentStatus>(currentStatus);
  const [eventNote, setEventNote] = useState('');
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [eventFiles, setEventFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [failedPreviewUrls, setFailedPreviewUrls] = useState<Set<number>>(new Set());
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const access = useRoleAccess(currentUser?.role);
  const { getUserDisplayName } = useUsersCatalog();
  const isMobile = useIsMobile();

  const sortedEvents = [...events].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const RECENT_EVENTS_VISIBLE = 2;
  const visibleRecentEvents = showAllRecentEvents
    ? sortedEvents
    : sortedEvents.slice(0, RECENT_EVENTS_VISIBLE);
  const hiddenRecentEventsCount = Math.max(0, sortedEvents.length - RECENT_EVENTS_VISIBLE);

  useEffect(() => {
    setShowAllRecentEvents(false);
  }, [events.length]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(pdfPreviewUrl);
        } catch {
          // Ignorar errores al revocar
        }
      }
    };
  }, [pdfPreviewUrl]);
  
  // Actualizar selectedStatus cuando cambia currentStatus
  useEffect(() => {
    const next = getNextStatus(currentStatus);
    setSelectedStatus(next ?? currentStatus);
  }, [currentStatus]);

  const nextStatus = getNextStatus(currentStatus);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPhotos = Array.from(files);
      logger.debug('Fotos seleccionadas', {
        count: newPhotos.length,
        names: newPhotos.map(f => f.name),
        sizes: newPhotos.map(f => f.size)
      });
      
      // Validar que sean imágenes
      const validPhotos = newPhotos.filter(photo => {
        const isValid = photo.type.startsWith('image/');
        if (!isValid) {
          logger.warn('Archivo no es una imagen', { fileName: photo.name, type: photo.type });
        }
        return isValid;
      });
      
      if (validPhotos.length === 0) {
        logger.warn('No hay fotos válidas para agregar');
        return;
      }
      
      setEventPhotos((prev) => [...prev, ...validPhotos]);

      // Crear data URLs para mini-previsualización (sin visor grande)
      validPhotos.forEach((photo) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          const result = event.target?.result;
          if (typeof result === 'string') {
            setPhotoPreviewUrls((prev) => [...prev, result]);
          } else {
            setPhotoPreviewUrls((prev) => [...prev, '']);
          }
        };

        reader.onerror = () => {
          logger.warn('No se pudo generar previsualización de foto', { photoName: photo.name });
          setPhotoPreviewUrls((prev) => [...prev, '']);
        };

        reader.readAsDataURL(photo);
      });
      
      // Reset input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setEventPhotos(eventPhotos.filter((_, i) => i !== index));
    setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));

    const adjustedFailed = new Set<number>();
    failedPreviewUrls.forEach((failedIndex) => {
      if (failedIndex < index) adjustedFailed.add(failedIndex);
      if (failedIndex > index) adjustedFailed.add(failedIndex - 1);
    });
    setFailedPreviewUrls(adjustedFailed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setEventFiles([...eventFiles, ...newFiles]);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = eventFiles[index];
    setEventFiles(eventFiles.filter((_, i) => i !== index));

    if (fileToRemove && pdfPreviewName === fileToRemove.name) {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(pdfPreviewUrl);
        } catch {
          // Ignorar errores al revocar
        }
      }
      setPdfPreviewUrl(null);
      setPdfPreviewName(null);
    }
  };

  const handlePreviewFile = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return;

    if (pdfPreviewUrl && pdfPreviewName === file.name) {
      closePdfPreview();
      return;
    }

    if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(pdfPreviewUrl);
      } catch {
        // Ignorar errores al revocar
      }
    }

    const fileUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(fileUrl);
    setPdfPreviewName(file.name);
  };

  const closePdfPreview = () => {
    if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(pdfPreviewUrl);
      } catch {
        // Ignorar errores al revocar
      }
    }
    setPdfPreviewUrl(null);
    setPdfPreviewName(null);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentUser) {
      logger.error('No hay usuario actual');
      return;
    }
    if (!canUpdateToStatus(currentStatus, selectedStatus)) {
      logger.error('Estado no permitido para actualización', {
        componentId,
        currentStatus,
        selectedStatus,
        nextStatus,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      logger.debug('Iniciando actualización de estado', {
        componentId,
        currentStatus,
        newStatus: selectedStatus,
        hasNote: !!eventNote,
        photosCount: eventPhotos.length,
        filesCount: eventFiles.length
      });
      await submitTimelineUpdate({
        componentId,
        selectedStatus,
        eventNote,
        eventPhotos,
        eventFiles,
        createdBy: currentUser.id,
        onEventAdded,
        onStatusUpdated,
      });

      logger.debug('Estado actualizado exitosamente', { componentId, newStatus: selectedStatus });

      // Reset form
      setEventNote('');
      setEventPhotos([]);
      setPhotoPreviewUrls([]);
      setFailedPreviewUrls(new Set());
      setEventFiles([]);
      closePdfPreview();
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedStatus(selectedStatus); // Mantener el nuevo estado seleccionado
      setIsDialogOpen(false);
    } catch (error: unknown) {
      logger.error('Error al actualizar estado', {
        errorMessage: error instanceof Error ? error.message : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        componentId,
        selectedStatus,
      });
      // El error ya se maneja en handleEventAdded y handleStatusUpdated con toasts
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAddEvent = Boolean(selectedStatus && currentUser && access.canEditTimeline);
  const emphasizedFieldClassName = 'border-transparent shadow-sm';
  const emphasizedFieldStyle = { borderColor: 'rgba(15, 23, 42, 0.14)' } as const;
  const mobileDialogStyle = {
    position: 'fixed' as const,
    left: '0.5rem',
    right: '0.5rem',
    top: '5vh',
    transform: 'none',
    translate: 'none',
    width: 'auto',
    maxWidth: 'none',
    height: '90vh',
    maxHeight: '90vh',
    boxSizing: 'border-box' as const,
  };
  const desktopDialogStyle = {
    height: '90vh',
    maxHeight: '90vh',
    width: 'min(56rem, 95vw)',
    maxWidth: 'min(56rem, 95vw)',
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (open && nextStatus) {
      setSelectedStatus(nextStatus);
    }
    if (!open) {
      closePdfPreview();
    }
    setIsDialogOpen(open);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 pr-2 sm:pr-3">
            <Clock className="h-5 w-5 shrink-0" />
            <span className="leading-snug">Gestión de Línea de Tiempo</span>
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="timeline-update-button shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Actualizar Estado
              </Button>
            </DialogTrigger>
            <DialogContent
              hideCloseButton
              className={
                isMobile
                  ? 'overflow-hidden !flex !flex-col !gap-0 !p-0'
                  : 'max-w-4xl w-full overflow-hidden !flex !flex-col !gap-0 !p-0'
              }
              style={isMobile ? mobileDialogStyle : desktopDialogStyle}
              onWheelCapture={(event) => event.stopPropagation()}
            >
              <div
                className={cn('flex flex-col', isMobile && 'min-w-0 w-full')}
                style={{ minHeight: 0, height: '100%' }}
              >
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={() => handleDialogOpenChange(false)}
                className="absolute z-20 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-red-600 bg-red-600 p-0 text-white shadow-sm transition-colors hover:border-red-700 hover:bg-red-700 hover:text-white"
                style={{ top: '0.75rem', right: '0.75rem' }}
              >
                <X className="h-4 w-4" />
              </button>
              <DialogHeader
                className={cn(
                  'shrink-0 border-b py-3 !text-left',
                  isMobile ? 'px-4 pr-12' : 'pl-0 pr-4',
                )}
              >
                <DialogTitle className="text-left">Actualizar Línea de Tiempo</DialogTitle>
              </DialogHeader>
              
              <div
                className={isMobile ? 'min-w-0 w-full space-y-4 px-4 py-3' : 'min-w-0 space-y-4 py-3 pl-4 pr-7'}
                style={
                  isMobile
                    ? {
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        overscrollBehavior: 'contain',
                      }
                    : {
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        overscrollBehavior: 'contain',
                        scrollbarGutter: 'stable',
                        marginRight: '-0.75rem',
                      }
                }
              >
                {/* Status Selection */}
                <div className={cn('min-w-0 space-y-2', !isMobile && 'pr-4')}>
                  <Label>Nuevo Estado</Label>
                  <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ComponentStatus)}>
                    <SelectTrigger
                      className={isMobile ? cn(emphasizedFieldClassName, 'min-w-0') : emphasizedFieldClassName}
                      style={emphasizedFieldStyle}
                    >
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((status) => {
                        const isCurrent = status === currentStatus;
                        const isNext = status === nextStatus;
                        const isSelectable = isCurrent || isNext;
                        
                        return (
                          <SelectItem 
                            key={status} 
                            value={status}
                            disabled={!isSelectable}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{STATUS_LABELS[status]}</span>
                              {isCurrent && <Badge variant="outline" className="ml-2">Actual</Badge>}
                              {isNext && <Badge variant="secondary" className="ml-2">Siguiente</Badge>}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {!nextStatus && (
                    <p className="text-sm text-muted-foreground">
                      Estado final: puede actualizar el estado actual con nueva información.
                    </p>
                  )}
                  {selectedStatus === currentStatus && (
                    <p className="text-sm text-muted-foreground">
                      Se agregará información al estado actual sin avanzar en el flujo.
                    </p>
                  )}
                </div>

                {/* Event Note */}
                <div className={cn('min-w-0 space-y-2', !isMobile && 'pr-4')}>
                  <Label>Nota del Evento (Opcional)</Label>
                  <Textarea
                    placeholder="Describa los detalles de este evento..."
                    value={eventNote}
                    onChange={(e) => setEventNote(e.target.value)}
                    rows={3}
                    className={cn('resize-none min-w-0 max-w-full', emphasizedFieldClassName)}
                    style={emphasizedFieldStyle}
                  />
                </div>

                {/* Photos */}
                <div className="min-w-0 space-y-2">
                  <Label>Fotos de Validación</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                      id="photo-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => photoInputRef.current?.click()}
                      className={cn(
                        'border-transparent shadow-sm',
                        isMobile ? 'w-full' : 'whitespace-nowrap',
                      )}
                      style={emphasizedFieldStyle}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Fotos
                    </Button>
                  </div>
                  {eventPhotos.length > 0 && (
                    <div className="space-y-2">
                      <div
                        className="grid gap-3"
                        style={{
                          gridTemplateColumns: isMobile
                            ? 'repeat(auto-fill, minmax(120px, 1fr))'
                            : 'repeat(auto-fill, minmax(170px, 170px))',
                        }}
                      >
                        {eventPhotos.map((photo, index) => (
                          <div key={index} className={isMobile ? 'relative min-w-0' : 'relative w-[170px]'}>
                            <div
                              className={
                                isMobile
                                  ? 'relative group aspect-[17/12] w-full rounded border overflow-hidden bg-muted'
                                  : 'relative group h-[120px] w-[170px] rounded border overflow-hidden bg-muted'
                              }
                            >
                              {photoPreviewUrls[index] && !failedPreviewUrls.has(index) ? (
                                <img
                                  src={photoPreviewUrls[index]}
                                  alt={photo.name}
                                  className="w-full h-full object-cover"
                                  onError={() => {
                                    setFailedPreviewUrls((prev) => new Set([...prev, index]));
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-2">
                                  <Camera className="w-6 h-6 mb-1 opacity-50" />
                                  <span className="text-center">
                                    {failedPreviewUrls.has(index) ? 'Error al cargar' : 'Sin preview'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-100 shadow-sm"
                              title="Eliminar imagen"
                              style={{ top: 6, right: 6 }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                            <div
                              className={
                                isMobile
                                  ? 'mt-1 text-xs text-muted-foreground truncate'
                                  : 'mt-1 w-[170px] text-xs text-muted-foreground truncate'
                              }
                              title={photo.name}
                            >
                              {photo.name}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {eventPhotos.length} {eventPhotos.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos permitidos: JPG, PNG, GIF, WEBP
                  </p>
                </div>

                {/* Files */}
                <div className="min-w-0 space-y-2">
                  <Label>Archivos Adjuntos</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xlsm,.pdf,.docx,.txt"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'border-transparent shadow-sm',
                        isMobile ? 'w-full' : 'whitespace-nowrap',
                      )}
                      style={emphasizedFieldStyle}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Archivos
                    </Button>
                  </div>
                  {eventFiles.length > 0 && (
                    <div className="space-y-2">
                      {eventFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          {(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewFile(file)}
                              className="flex-shrink-0"
                              title={pdfPreviewName === file.name ? 'Cerrar vista previa' : 'Previsualizar PDF'}
                            >
                              {pdfPreviewName === file.name && pdfPreviewUrl ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {pdfPreviewUrl && (
                    <div className="rounded-md border bg-background overflow-hidden">
                      <div className="flex items-center justify-between border-b px-3 py-2">
                        <p className="truncate text-sm font-medium">{pdfPreviewName || 'Vista previa PDF'}</p>
                        <Button type="button" variant="ghost" size="sm" onClick={closePdfPreview}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <iframe
                        src={pdfPreviewUrl}
                        title={pdfPreviewName || 'Vista previa PDF'}
                        className="w-full border-0"
                        style={{ height: '28rem' }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos permitidos: XLSX, XLSM, PDF, DOCX, TXT
                  </p>
                </div>

              </div>
              <div className="border-t bg-background px-4 py-3" style={{ flexShrink: 0 }}>
                <div className={cn('flex gap-2', isMobile ? 'flex-col-reverse' : 'justify-end')}>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className={isMobile ? 'w-full' : 'whitespace-nowrap'}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!canAddEvent || !canUpdateToStatus(currentStatus, selectedStatus) || isSubmitting}
                  className={isMobile ? 'w-full' : 'whitespace-nowrap'}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Actualizando...' : 'Actualizar Estado'}
                </Button>
                </div>
              </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Status */}
          <div className="p-4 timeline-status-panel rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Estado Actual</p>
                <p className="text-sm text-muted-foreground">{STATUS_LABELS[currentStatus]}</p>
              </div>
              <Badge variant="secondary" className="progress-in-progress-badge">
                {STATUS_ORDER.indexOf(currentStatus) + 1} de {STATUS_ORDER.length}
              </Badge>
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <h4 className="font-medium mb-3">Eventos Recientes</h4>
            {sortedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay eventos registrados
              </p>
            ) : (
              <div className="space-y-3">
                {visibleRecentEvents.map((event) => (
                  <div key={event.id} className="min-w-0 overflow-hidden rounded-lg border p-3">
                    <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="max-w-full shrink truncate">
                        {STATUS_LABELS[event.estado]}
                      </Badge>
                      <div className="flex shrink-0 items-center text-xs text-muted-foreground">
                        <Calendar className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
                        {new Date(event.created_at).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    {event.nota && (
                      <p className="event-note-text mb-2 text-sm text-muted-foreground">
                        {event.nota}
                      </p>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="min-w-0 max-w-full break-words">
                        {getUserDisplayName(event.created_by)}
                      </div>
                      <div className="flex items-center space-x-3">
                        {event.fotos.length > 0 && (
                          <span className="flex items-center">
                            <Camera className="w-3 h-3 mr-1" />
                            {event.fotos.length}
                          </span>
                        )}
                        {(() => {
                          // Obtener documentos relacionados con este evento (por fecha aproximada)
                          const eventDate = new Date(event.created_at);
                          const relatedDocs = documents.filter((doc) => {
                            const docDate = new Date(doc.uploaded_at || doc.created_at || event.created_at);
                            const diffHours = Math.abs(eventDate.getTime() - docDate.getTime()) / (1000 * 60 * 60);
                            return diffHours < 24; // Documentos subidos en las últimas 24 horas del evento
                          });
                          const totalDocs = relatedDocs.length + event.archivos.length;
                          
                          if (totalDocs > 0) {
                            return (
                              <span className="flex items-center">
                                <FileText className="w-3 h-3 mr-1" />
                                {totalDocs}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
                {hiddenRecentEventsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRecentEvents((prev) => !prev)}
                    className="timeline-events-expand"
                    aria-expanded={showAllRecentEvents}
                    aria-label={showAllRecentEvents ? 'Ocultar eventos' : `Mostrar ${hiddenRecentEventsCount} eventos más`}
                  >
                    <ChevronDown
                      className={cn(
                        'timeline-events-expand__icon',
                        showAllRecentEvents && 'timeline-events-expand__icon--open',
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      {showAllRecentEvents
                        ? 'Ver menos'
                        : `${hiddenRecentEventsCount} eventos más...`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}