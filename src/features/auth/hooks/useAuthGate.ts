'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { type User, type UserRole } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/store/auth-store';
import { useCurrentUser } from './useCurrentUser';

type AuthGateMode = 'guest' | 'protected';

interface UseAuthGateOptions {
  mode: AuthGateMode;
  requiredRoles?: readonly UserRole[];
  redirectAuthenticatedTo?: string;
  redirectUnauthenticatedTo?: string;
  redirectUnauthorizedTo?: string;
  prefetchRoutes?: readonly string[];
  onAuthenticated?: (user: User) => Promise<void> | void;
}

function pathsMatch(currentPath: string, targetPath: string): boolean {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function redirectIfNeeded(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  target: string,
): boolean {
  if (pathsMatch(pathname, target)) {
    return false;
  }
  router.replace(target);
  return true;
}

export function useAuthGate({
  mode,
  requiredRoles,
  redirectAuthenticatedTo = '/dashboard',
  redirectUnauthenticatedTo = '/login',
  redirectUnauthorizedTo = '/dashboard',
  prefetchRoutes,
  onAuthenticated,
}: UseAuthGateOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const storeUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const { refreshUser } = useCurrentUser({ autoLoad: false });

  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const onAuthenticatedRef = useRef(onAuthenticated);
  onAuthenticatedRef.current = onAuthenticated;

  const requiredRolesKey = requiredRoles?.join('|') ?? '';
  const prefetchRoutesKey = prefetchRoutes?.join('|') ?? '';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsVerifying(true);

      try {
        const currentUser = await refreshUser();

        if (cancelled) {
          return;
        }

        const roles = requiredRoles ?? [];

        if (mode === 'guest') {
          if (currentUser) {
            logger.info('Guest page blocked for authenticated user', { userId: currentUser.id });
            redirectIfNeeded(router, pathname, redirectAuthenticatedTo);
            return;
          }

          setVerifiedUser(null);
          return;
        }

        if (!currentUser) {
          clearUser();
          setVerifiedUser(null);
          redirectIfNeeded(router, pathname, redirectUnauthenticatedTo);
          return;
        }

        if (roles.length > 0 && !roles.includes(currentUser.role)) {
          logger.warn('User does not satisfy required roles', {
            userId: currentUser.id,
            role: currentUser.role,
            requiredRoles: roles,
          });
          redirectIfNeeded(router, pathname, redirectUnauthorizedTo);
          return;
        }

        setUser(currentUser);
        setVerifiedUser(currentUser);
        prefetchRoutes?.forEach((route) => router.prefetch(route));
        void onAuthenticatedRef.current?.(currentUser);
      } catch (error) {
        logger.error('Error resolving auth gate', { error, mode });
        if (cancelled) {
          return;
        }

        clearUser();
        setVerifiedUser(null);
        redirectIfNeeded(router, pathname, redirectUnauthenticatedTo);
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    clearUser,
    mode,
    pathname,
    prefetchRoutesKey,
    redirectAuthenticatedTo,
    redirectUnauthenticatedTo,
    redirectUnauthorizedTo,
    refreshUser,
    requiredRolesKey,
    router,
    setUser,
    storeUser,
  ]);

  const user =
    verifiedUser ?? (mode === 'protected' ? storeUser : null);

  return {
    user,
    isLoading: isVerifying && !user,
  };
}
