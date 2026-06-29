'use client';

import { useRouter, useParams } from 'next/navigation';
import { ComponentDetail } from '@/components/hydraulic/ComponentDetail';
import { ComponentDetailSkeleton } from '@/components/common/LoadingStates';
import { useAuthGate } from '@/features/auth/hooks/useAuthGate';

export default function ComponentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const componentId = params.id as string;
  const { user, isLoading: isAuthLoading } = useAuthGate({ mode: 'protected' });

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (isAuthLoading || !user) {
    return <ComponentDetailSkeleton />;
  }

  return (
    <ComponentDetail
      componentId={componentId}
      currentUser={user}
      onBack={handleBack}
    />
  );
}
