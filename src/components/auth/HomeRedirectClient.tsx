'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export function HomeRedirectClient() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useCurrentUser({ autoLoad: false });

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await refreshUser();
        if (currentUser) {
          logger.info('User authenticated, redirecting to dashboard', { userId: currentUser.id });
          router.prefetch('/dashboard');
          router.replace('/dashboard');
        } else {
          logger.info('No user authenticated, redirecting to login');
          router.prefetch('/login');
          router.replace('/login');
        }
      } catch (error) {
        logger.warn('Error checking auth status', { error });
        router.prefetch('/login');
        router.replace('/login');
      }
    };

    if (!isLoading || user) {
      void init();
    }
  }, [isLoading, refreshUser, router, user]);

  return <PageLoading />;
}
