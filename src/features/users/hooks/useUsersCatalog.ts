'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUserDisplayName, loadUsersCatalog } from '@/features/users/catalog';

export function useUsersCatalog(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;
  const [isLoading, setIsLoading] = useState(autoLoad);

  const refreshUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadUsersCatalog();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refreshUsers();
    }
  }, [autoLoad, refreshUsers]);

  return {
    getUserDisplayName,
    isLoading,
    refreshUsers,
  };
}
