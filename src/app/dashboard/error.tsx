'use client';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">No se pudo cargar el dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || 'Ocurrió un error inesperado al cargar la información.'}
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
