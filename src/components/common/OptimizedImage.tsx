'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '../ui/utils';
import { Skeleton } from '../ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  fallback?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * Componente de imagen optimizado que usa Next.js Image
 * con fallback y loading states
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fallback,
  objectFit = 'contain',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  // Si la imagen es externa o requiere autenticación, usar img normal
  const isExternal = src.startsWith('http') && !src.includes(process.env.NEXT_PUBLIC_API_URL || '');
  const needsAuth = src.includes('/api/') || src.includes('token=');

  if (isExternal || needsAuth) {
    // Para imágenes externas o que requieren auth, usar img con lazy loading
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {isLoading && (
          <Skeleton className="absolute inset-0" />
        )}
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
            if (fallback) {
              setImageSrc(fallback);
            }
          }}
          style={fill ? { objectFit } : undefined}
        />
        {hasError && !fallback && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            <p className="text-sm">Error al cargar imagen</p>
          </div>
        )}
      </div>
    );
  }

  // Para imágenes locales, usar Next.js Image
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <Skeleton className="absolute inset-0" />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'cover' && 'object-cover',
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
          if (fallback) {
            setImageSrc(fallback);
          }
        }}
      />
      {hasError && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <p className="text-sm">Error al cargar imagen</p>
        </div>
      )}
    </div>
  );
}

