import { createPageMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = createPageMetadata({
  title: 'Componentes',
  description: 'Gestión y seguimiento de componentes hidráulicos en proceso de mantenimiento.',
  path: '/components',
  noIndex: true, // No indexar (requiere autenticación)
});

export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

