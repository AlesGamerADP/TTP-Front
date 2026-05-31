import { create } from 'zustand';
import type { Component } from '../lib/auth';

interface ComponentsState {
  components: Component[];
  companies: any[];
  selectedComponent: Component | null;
  isLoading: boolean;
  error: string | null;
  
  // Cache de estadísticas
  stats: {
    total: number;
    byStatus: Record<string, number>;
    byCompany: Record<string, number>;
  } | null;
  
  // Actions
  setComponents: (components: Component[]) => void;
  addComponent: (component: Component) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  removeComponent: (id: string) => void;
  setSelectedComponent: (component: Component | null) => void;
  setCompanies: (companies: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStats: (stats: { total: number; byStatus: Record<string, number>; byCompany: Record<string, number> }) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  components: [],
  companies: [],
  selectedComponent: null,
  isLoading: false,
  error: null,
  stats: null,
};

export const useComponentsStore = create<ComponentsState>((set) => ({
  ...initialState,

  setComponents: (components) => set({ components }),

  addComponent: (component) => set((state) => ({
    components: [...state.components, component],
  })),

  updateComponent: (id, updates) => set((state) => ({
    components: state.components.map((comp) =>
      comp.id === id ? { ...comp, ...updates } : comp
    ),
    selectedComponent: state.selectedComponent?.id === id
      ? { ...state.selectedComponent, ...updates }
      : state.selectedComponent,
  })),

  removeComponent: (id) => set((state) => ({
    components: state.components.filter((comp) => comp.id !== id),
    selectedComponent: state.selectedComponent?.id === id
      ? null
      : state.selectedComponent,
  })),

  setSelectedComponent: (component) => set({ selectedComponent: component }),

  setCompanies: (companies) => set({ companies }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setStats: (stats) => set({ stats }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

