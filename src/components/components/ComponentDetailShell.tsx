'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface ComponentDetailShellProps {
  onBack?: () => void;
}

/** Shell ligero para FCP/LCP mientras llegan los datos del componente. */
export function ComponentDetailShell({ onBack }: ComponentDetailShellProps) {
  return (
    <div className="app-shell min-h-screen">
      <header className="app-subheader sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="back-nav-button shrink-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          ) : (
            <Skeleton className="h-9 w-24" />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-40 max-w-xs" />
          </div>
          <Skeleton className="hidden h-8 w-28 sm:block" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
