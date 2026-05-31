"use client";
import { Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { getComponentQuery } from '@/features/components/queries';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useAuthGate } from '@/features/auth/hooks/useAuthGate';
import { INGRESS_REQUIRED_ROLES } from '@/features/auth/constants';

// Lazy load del componente de ingreso
const ComponentIngress = lazy(() => 
  import('@/features/components/views/ComponentIngressView')
);

export default function ComponentIngressPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthGate({
    mode: 'protected',
    requiredRoles: INGRESS_REQUIRED_ROLES,
  });

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleComponentCreated = async (componentId: string) => {
    try {
      const component = await getComponentQuery(componentId);
      
      if (component) {
        logger.debug('Component created, navigating to detail', { 
          componentId: component.id, 
          serial: component.serial 
        });
        // Prefetch antes de navegar
        router.prefetch(`/components/${component.id}`);
        router.push(`/components/${component.id}`);
      } else {
        logger.warn('Component created but could not be loaded', { componentId });
        toast.error('Componente creado pero no se pudo cargar. Redirigiendo al dashboard.');
        router.push('/dashboard');
      }
    } catch (error) {
      logger.error('Error loading created component', { componentId, error });
      toast.error('Error al cargar el componente creado. Redirigiendo al dashboard.');
      router.push('/dashboard');
    }
  };

  if (isLoading || !user) {
    return <PageLoading />;
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <ComponentIngress
        currentUser={user}
        onBack={handleBack}
        onComponentCreated={handleComponentCreated}
      />
    </Suspense>
  );
}
