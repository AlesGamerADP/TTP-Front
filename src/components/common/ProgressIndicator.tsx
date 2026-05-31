'use client';

import { Progress } from '../ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';

interface ProgressIndicatorProps {
  progress?: number; // 0-100
  isLoading?: boolean;
  message?: string;
  className?: string;
  showSpinner?: boolean;
}

export function ProgressIndicator({
  progress,
  isLoading = false,
  message,
  className,
  showSpinner = true,
}: ProgressIndicatorProps) {
  if (!isLoading && progress === undefined) {
    return null;
  }

  return (
    <div
      className={cn('space-y-2', className)}
      role="progressbar"
      aria-label={message || 'Cargando'}
      aria-busy={isLoading || progress !== undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      <div className="flex items-center gap-2">
        {showSpinner && isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {progress !== undefined ? (
          <Progress value={progress} className="flex-1" />
        ) : (
          <Progress value={undefined} className="flex-1" />
        )}
      </div>
    </div>
  );
}

