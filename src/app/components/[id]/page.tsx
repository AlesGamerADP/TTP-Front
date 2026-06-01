'use client';

import { useRouter, useParams } from 'next/navigation';
import ComponentDetail from '@/features/components/views/ComponentDetailView';
import { ComponentDetailShell } from '@/components/components/ComponentDetailShell';
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
    return <ComponentDetailShell onBack={handleBack} />;
  }

  return (
    <ComponentDetail
      componentId={componentId}
      currentUser={user}
      onBack={handleBack}
    />
  );
}
