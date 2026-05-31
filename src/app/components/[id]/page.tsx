"use client";
import { Suspense, useEffect, useState, lazy } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getComponentQuery } from '@/features/components/queries';
import { logger } from '@/lib/logger';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useAuthGate } from '@/features/auth/hooks/useAuthGate';

// Lazy load del componente de detalle
const ComponentDetail = lazy(() => 
  import('@/features/components/views/ComponentDetailView')
);

export default function ComponentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const componentId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [componentExists, setComponentExists] = useState(false);
  const { user } = useAuthGate({ mode: 'protected' });

  useEffect(() => {
    if (!user || !componentId) {
      return;
    }

    const validateComponent = async () => {
      try {
        const component = await getComponentQuery(componentId).catch(() => null);
        if (!component) {
          logger.warn('Component not found', { componentId });
          router.push('/dashboard');
          return;
        }
        setComponentExists(true);
        setIsLoading(false);
      } catch (error) {
        logger.error('Error initializing component detail', { error });
        router.push('/dashboard');
      }
    };

    void validateComponent();
  }, [componentId, router, user]);

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (isLoading || !user) {
    return <PageLoading />;
  }

  if (!componentExists) {
    return <PageLoading />;
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <ComponentDetail
        componentId={componentId}
        currentUser={user}
        onBack={handleBack}
      />
    </Suspense>
  );
}
