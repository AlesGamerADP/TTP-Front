import { createPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = createPageMetadata({
  title: 'Iniciar Sesión',
  description: 'Accede al portal de mantenimiento hidráulico de INGETEC para gestionar y seguir el estado de tus componentes.',
  path: '/login',
  noIndex: true, // No indexar página de login
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

