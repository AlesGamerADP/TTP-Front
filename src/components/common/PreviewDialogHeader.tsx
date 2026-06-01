'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/components/ui/utils';

interface PreviewDialogHeaderProps {
  title: string;
  description?: string;
  onClose: () => void;
  className?: string;
}

export function PreviewDialogHeader({
  title,
  description,
  onClose,
  className,
}: PreviewDialogHeaderProps) {
  return (
    <div
      className={cn(
        'preview-dialog-header flex shrink-0 items-start justify-between gap-3 border-b bg-background px-4 pb-3 text-foreground',
        'pt-[max(0.75rem,env(safe-area-inset-top,0px))]',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1 pr-2 pt-1">
        <DialogTitle className="text-left text-base font-semibold leading-snug sm:text-lg">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="text-left text-xs text-muted-foreground sm:text-sm">
            {description}
          </DialogDescription>
        ) : null}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="preview-dialog-close h-11 w-11 shrink-0 rounded-full border-2 border-border bg-card text-foreground shadow-lg hover:bg-muted"
        onClick={onClose}
        aria-label="Cerrar vista previa"
      >
        <X className="h-5 w-5" aria-hidden />
      </Button>
    </div>
  );
}
