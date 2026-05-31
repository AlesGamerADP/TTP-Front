import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">Página no encontrada</h2>
        <p className="text-sm text-muted-foreground">
          La ruta solicitada no existe o ya no está disponible.
        </p>
        <Button asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
