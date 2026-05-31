import { create } from 'zustand';
import type { User } from '../lib/auth';

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  users: [],
  isLoading: false,
  error: null,
};

export const useUsersStore = create<UsersState>((set) => ({
  ...initialState,

  setUsers: (users) => set({ users }),

  addUser: (user) => set((state) => ({
    users: [...state.users, user],
  })),

  updateUser: (id, updates) => set((state) => ({
    users: state.users.map((user) =>
      user.id === id ? { ...user, ...updates } : user
    ),
  })),

  removeUser: (id) => set((state) => ({
    users: state.users.filter((user) => user.id !== id),
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

