"use client";
import { Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/lib/logger';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { type User } from '@/lib/auth';
import { useAuthGate } from '@/features/auth/hooks/useAuthGate';

// Lazy load del componente de login
const LoginForm = lazy(() => 
  import('@/components/auth/LoginForm').then(module => ({ default: module.LoginForm }))
);

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { isLoading } = useAuthGate({ mode: 'guest' });

  const handleLogin = (user: User) => {
    logger.info('User logged in, redirecting to dashboard', { userId: user.id });
    setUser(user);
    router.replace('/dashboard');
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <LoginForm onLogin={handleLogin} />
    </Suspense>
  );
}
