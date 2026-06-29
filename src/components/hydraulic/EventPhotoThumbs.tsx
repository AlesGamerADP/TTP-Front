'use client';

import { componentsApi } from '@/lib/api';
import { LazyImage } from '../common/LazyImage';
import { cn } from '../ui/utils';

type EventPhotoThumbsProps = {
  fotos: string[];
  max?: number;
  className?: string;
  onThumbClick?: () => void;
};

export function EventPhotoThumbs({
  fotos,
  max = 4,
  className,
  onThumbClick,
}: EventPhotoThumbsProps) {
  if (!fotos?.length) return null;

  const visible = fotos.slice(0, max);
  const extra = fotos.length - visible.length;

  return (
    <div className={cn('flex flex-wrap gap-1.5 mt-2', className)}>
      {visible.map((photo, index) => (
        <button
          key={`${photo}-${index}`}
          type="button"
          onClick={onThumbClick}
          className="relative h-12 w-12 overflow-hidden rounded border bg-muted shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Miniatura foto ${index + 1}`}
        >
          <LazyImage
            src={componentsApi.getPhotoUrl(photo, { size: 'thumb' })}
            alt=""
            photoSize="thumb"
            className="h-full w-full object-cover"
          />
        </button>
      ))}
      {extra > 0 && (
        <span className="flex h-12 w-12 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
