import { createPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = createPageMetadata({
  title: 'Dashboard',
  description: 'Panel de control para gestionar y visualizar el estado de tus componentes hidráulicos en mantenimiento.',
  path: '/dashboard',
  noIndex: true, // No indexar dashboard (requiere autenticación)
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

