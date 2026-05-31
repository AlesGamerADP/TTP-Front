'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook para prefetch automático de rutas
 * Útil para pre-cargar rutas probables cuando el usuario está en una página
 */
export function usePrefetch(routes: string[]) {
  const router = useRouter();

  useEffect(() => {
    // Prefetch todas las rutas en paralelo
    routes.forEach(route => {
      router.prefetch(route);
    });
  }, [router, routes]);
}

/**
 * Hook para prefetch de rutas relacionadas basado en el contexto
 */
export function useSmartPrefetch(userRole?: string) {
  const router = useRouter();

  useEffect(() => {
    const routes: string[] = ['/dashboard'];

    // Prefetch rutas según el rol del usuario
    if (userRole === 'interno' || userRole === 'admin' || userRole === 'user_manager') {
      routes.push('/components/ingress');
    }

    routes.forEach(route => {
      router.prefetch(route);
    });
  }, [router, userRole]);
}

