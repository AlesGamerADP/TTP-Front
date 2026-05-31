'use client';

import { cn } from '../ui/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ className, size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          sizeClasses[size]
        )}
        aria-label="Cargando"
        role="status"
      />
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" text="Cargando..." />
    </div>
  );
}

