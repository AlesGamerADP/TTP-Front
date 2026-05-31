'use client';

import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '../ui/utils';
import { Skeleton } from '../ui/skeleton';
import { logger } from '../../lib/logger';
import { componentsApi, type PhotoDeliverySize } from '../../lib/api';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  skeletonClassName?: string;
  photoSize?: PhotoDeliverySize;
}

export function LazyImage({
  src,
  alt,
  fallback,
  className,
  skeletonClassName,
  photoSize = 'medium',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Log cuando el componente se monta o cambia src
  useEffect(() => {
    logger.debug('Componente montado/actualizado', {
      src: src ? src.substring(0, 150) : 'NULL',
      alt,
      hasFallback: !!fallback,
      timestamp: new Date().toISOString()
    });
  }, [src, alt, fallback]);

  // Cargar imagen usando fetch si la URL contiene un token (para autenticación)
  useEffect(() => {
    if (!isInView || !src) {
      logger.debug('No cargando imagen', {
        isInView,
        hasSrc: !!src,
        src: src ? src.substring(0, 100) + '...' : 'null'
      });
      return;
    }
    
    logger.debug('Iniciando carga de imagen', {
      src: src.substring(0, 150),
      srcLength: src.length,
      isInView,
      hasBlobUrl: !!blobUrl
    });
    
    // Fotos y documentos del backend requieren cookie de sesión (no hay /uploads/ público)
    const needsAuth =
      src.includes('token=') ||
      src.includes('/api/components/_photos/') ||
      src.includes('/uploads/');
    
    logger.debug('Evaluando necesidad de autenticación', {
      needsAuth,
      hasToken: src.includes('token='),
      hasPhotosPath: src.includes('/api/components/_photos/')
    });
    
    let currentBlobUrl: string | null = null;
    
    if (needsAuth) {
      logger.debug('Cargando imagen con autenticación', {
        src: src.substring(0, 150),
        method: 'fetch'
      });
      
      // Extraer token de la URL si está en query string
      let token: string | null = null;
      try {
        const url = new URL(src);
        token = url.searchParams.get('token');
      } catch (e) {
        // Si no se puede parsear como URL, intentar extraer token manualmente
        const tokenMatch = src.match(/[?&]token=([^&]+)/);
        if (tokenMatch) {
          token = decodeURIComponent(tokenMatch[1]);
        }
      }
      
      // Preparar headers
      const headers: HeadersInit = {
        'Accept': 'image/*',
      };
      
      // Si hay token en la URL, agregarlo al header Authorization
      // (Las cookies httpOnly se envían automáticamente)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      logger.debug('Headers de fetch', {
        hasToken: !!token,
        hasAuthHeader: !!headers['Authorization'],
        acceptHeader: headers['Accept']
      });
      
      const fetchSrc = src.includes('/uploads/') || src.includes('/api/components/_photos/')
        ? componentsApi.getPhotoUrl(src, { size: photoSize })
        : src;

      fetch(fetchSrc, {
        method: 'GET',
        credentials: 'include',
        headers,
        mode: fetchSrc.startsWith('http') ? 'cors' : 'same-origin',
      })
        .then(response => {
          logger.debug('Respuesta fetch recibida', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            url: src.substring(0, 150),
            contentType: response.headers.get('content-type')
          });
          
          if (!response.ok) {
            const errorText = response.statusText || 'Unknown error';
            logger.error('Respuesta no OK', {
              status: response.status,
              statusText: errorText,
              url: src.substring(0, 150)
            });
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          logger.debug('Convirtiendo respuesta a blob');
          return response.blob();
        })
        .then(blob => {
          logger.debug('Blob recibido', {
            size: blob.size,
            type: blob.type,
            url: src.substring(0, 150)
          });
          
          if (blob.size === 0) {
            logger.error('Blob vacío recibido');
            throw new Error('Blob vacío recibido del servidor');
          }
          
          const url = URL.createObjectURL(blob);
          logger.debug('Blob URL creada exitosamente', {
            blobUrl: url.substring(0, 50) + '...',
            blobSize: blob.size,
            blobType: blob.type
          });
          currentBlobUrl = url;
          setBlobUrl(url);
          setIsLoaded(true);
        })
        .catch(error => {
          logger.error('Error completo en fetch', {
            src: src.substring(0, 150),
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack?.substring(0, 200),
            errorType: error.constructor.name
          });
          
          // Si es un error de CORS o red, las cookies se envían automáticamente
          // No necesitamos verificar tokens manualmente (están en cookies httpOnly)
          if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            logger.warn('Posible error de CORS o red en LazyImage', { src: src.substring(0, 100) });
          }
          
          setHasError(true);
          setIsLoaded(true);
          if (props.onError) {
            props.onError({ target: { error: error } } as any);
          }
        });
    } else {
      logger.debug('No requiere autenticación, usando src directo', {
        src: src.substring(0, 150)
      });
    }
    
    // Cleanup: revocar blob URL cuando el componente se desmonte o cambie la src
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      // También revocar el blobUrl actual si existe
      setBlobUrl(prev => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [isInView, src, photoSize]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // Cargar 50px antes de que sea visible
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    logger.debug('Imagen cargada exitosamente en el elemento img', {
      src: src.substring(0, 150),
      blobUrl: blobUrl ? blobUrl.substring(0, 50) + '...' : 'null',
      imageSrc: imageSrc.substring(0, 150)
    });
    setIsLoaded(true);
    if (props.onLoad) {
      props.onLoad({} as any);
    }
  };

  const handleError = (e: any) => {
    logger.error('Error cargando imagen en el elemento img', {
      src: src.substring(0, 150),
      imageSrc: imageSrc.substring(0, 150),
      blobUrl: blobUrl ? blobUrl.substring(0, 50) + '...' : 'null',
      error: e?.target?.error,
      errorCode: e?.target?.error?.code,
      errorMessage: e?.target?.error?.message,
      status: e?.target?.status,
      statusText: e?.target?.statusText,
      naturalWidth: e?.target?.naturalWidth,
      naturalHeight: e?.target?.naturalHeight,
      complete: e?.target?.complete
    });
    setHasError(true);
    setIsLoaded(true);
    if (props.onError) {
      props.onError(e);
    }
  };

  // Usar blob URL si está disponible, sino usar la src original
  const imageSrc = blobUrl || (hasError && fallback ? fallback : src);

  // Log de renderizado (usando useEffect para evitar logs en cada render)
  useEffect(() => {
    const logData = {
      src: src ? src.substring(0, 150) : 'NULL',
      imageSrc: imageSrc ? imageSrc.substring(0, 150) : 'NULL',
      hasBlobUrl: !!blobUrl,
      blobUrl: blobUrl ? blobUrl.substring(0, 50) + '...' : 'null',
      hasError,
      isLoaded,
      isInView,
      willShowFallback: hasError && fallback,
      timestamp: new Date().toISOString()
    };
    logger.debug('Renderizando LazyImage', logData);
    
    // También loggear en un objeto global para debugging
    if (typeof window !== 'undefined') {
      (window as any).__lazyImageDebug = (window as any).__lazyImageDebug || [];
      (window as any).__lazyImageDebug.push(logData);
      // Mantener solo los últimos 10 logs
      if ((window as any).__lazyImageDebug.length > 10) {
        (window as any).__lazyImageDebug.shift();
      }
    }
  }, [src, imageSrc, blobUrl, hasError, isLoaded, isInView, fallback]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!isLoaded && !hasError && (
        <Skeleton
          className={cn('absolute inset-0', skeletonClassName)}
          aria-hidden="true"
        />
      )}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground p-4">
          <p className="text-sm font-medium mb-1">Error al cargar la imagen</p>
          <p className="text-xs text-center">No se pudo mostrar la imagen solicitada</p>
          {fallback && (
            <img
              src={fallback}
              alt={alt}
              className="max-w-full max-h-full object-contain mt-2"
            />
          )}
        </div>
      )}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          onLoad={(e) => {
            logger.debug('LazyImage onLoad', {
              src: imageSrc.substring(0, 100),
              naturalWidth: (e.target as HTMLImageElement).naturalWidth,
              naturalHeight: (e.target as HTMLImageElement).naturalHeight,
              complete: (e.target as HTMLImageElement).complete
            });
            handleLoad();
          }}
          onError={(e) => {
            logger.error('LazyImage onError', {
              src: imageSrc.substring(0, 100),
              error: e.type
            });
            handleError(e);
          }}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading="lazy"
          crossOrigin="anonymous"
          {...props}
        />
      )}
      {!isInView && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Cargando...
        </div>
      )}
    </div>
  );
}

