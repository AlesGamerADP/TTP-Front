'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/lib/logger';
import { LoginForm } from '@/components/auth/LoginForm';
import { type User } from '@/lib/auth';
import { useAuthGate } from '@/features/auth/hooks/useAuthGate';
import { PageLoading } from '@/components/common/LoadingSpinner';

interface LoginClientPageProps {
  hasSessionCookie: boolean;
}

export default function LoginClientPage({ hasSessionCookie }: LoginClientPageProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  
  // useAuthGate in mode 'guest' redirects to /dashboard if authenticated
  const { isLoading } = useAuthGate({ mode: 'guest' });

  const handleLogin = (user: User) => {
    logger.info('User logged in, redirecting to dashboard', { userId: user.id });
    setUser(user);
    router.replace('/dashboard');
  };

  // Only show loading spinner if the user has a session cookie AND verification is still in progress
  const showLoading = hasSessionCookie && isLoading;

  if (showLoading) {
    return <PageLoading />;
  }

  return <LoginForm onLogin={handleLogin} />;
}
