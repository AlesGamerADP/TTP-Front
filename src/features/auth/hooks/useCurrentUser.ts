'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, type User } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';

interface UseCurrentUserOptions {
  autoLoad?: boolean;
}

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  const { autoLoad = true } = options;
  const { user, setUser, clearUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(autoLoad);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        clearUser();
      }
      return currentUser;
    } finally {
      setIsLoading(false);
    }
  }, [clearUser, setUser]);

  useEffect(() => {
    if (!autoLoad || user) {
      setIsLoading(false);
      return;
    }

    void refreshUser();
  }, [autoLoad, refreshUser, user]);

  return {
    user,
    isLoading,
    refreshUser,
  };
}
