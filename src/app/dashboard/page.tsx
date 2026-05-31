"use client";
import { Suspense, lazy, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type Component, type User } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/lib/logger';
import { PageLoading } from '@/components/common/LoadingSpinner';
import { useAuthGate } from '@/features/auth/hooks/useAuthGate';
import { DASHBOARD_PREFETCH_ROUTES } from '@/features/auth/constants';
import { useRoleAccess } from '@/features/auth/hooks/useRoleAccess';
import { loadCompaniesCatalog } from '@/features/companies/catalog';
import { loadUsersCatalog } from '@/features/users/catalog';

// Lazy load de los dashboards - solo se carga el que se necesita
const Dashboard = lazy(() => 
  import('@/components/dashboard/Dashboard').then(module => ({ default: module.Dashboard }))
);

const InternalDashboard = lazy(() => 
  import('@/components/dashboard/InternalDashboard').then(module => ({ default: module.InternalDashboard }))
);

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearUser } = useAuthStore();
  const handleAuthenticated = useCallback(async (currentUser: User) => {
    void loadCompaniesCatalog().catch((error) => {
      logger.warn('Error loading companies', { error });
    });
    void loadUsersCatalog().catch((error) => {
      logger.warn('Error loading users catalog', { error });
    });

    if (currentUser.role === 'interno' || currentUser.role === 'admin' || currentUser.role === 'user_manager') {
      router.prefetch('/components/ingress');
    }
  }, [router]);
  const { user: resolvedUser } = useAuthGate({
    mode: 'protected',
    prefetchRoutes: DASHBOARD_PREFETCH_ROUTES,
    onAuthenticated: handleAuthenticated,
  });
  const sessionUser = resolvedUser ?? user;
  const access = useRoleAccess(sessionUser?.role);

  const handleLogout = async () => {
    const { logout } = await import('@/lib/auth');
    logger.info('User logged out', { userId: sessionUser?.id });
    await logout();
    clearUser();
    router.push('/login');
  };

  const handleComponentSelect = (component: Component) => {
    logger.debug('Component selected', { componentId: component.id });
    router.prefetch(`/components/${component.id}`);
    router.push(`/components/${component.id}`);
  };

  const handleIngressClick = () => {
    logger.debug('Component ingress initiated', { userId: sessionUser?.id });
    router.push('/components/ingress');
  };

  if (!sessionUser) {
    return <PageLoading />;
  }

  const DashboardComponent = access.isBackoffice ? (
    <InternalDashboard
      user={sessionUser}
      onLogout={handleLogout}
      onComponentSelect={handleComponentSelect}
      onIngressClick={handleIngressClick}
    />
  ) : (
    <Dashboard
      user={sessionUser}
      onLogout={handleLogout}
      onComponentSelect={handleComponentSelect}
    />
  );

  return (
    <Suspense fallback={<PageLoading />}>
      {DashboardComponent}
    </Suspense>
  );
}
