'use client';

import { create } from 'zustand';
import type { User } from '../lib/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

/** Estado de sesión en memoria; la fuente de verdad son cookies httpOnly (same-origin vía /api). */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  clearUser: () =>
    set((state) => {
      if (!state.user && !state.isAuthenticated) {
        return state;
      }
      return {
        user: null,
        isAuthenticated: false,
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));
