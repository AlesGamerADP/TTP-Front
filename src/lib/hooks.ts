import { useState, useEffect, useCallback } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface UsePaginationProps {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetPage: () => void;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10
}: UsePaginationProps = {}): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const handleSetPageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  return {
    page,
    pageSize,
    setPage,
    setPageSize: handleSetPageSize,
    resetPage
  };
}

interface UseFiltersProps<T> {
  initialFilters?: T;
  onFiltersChange?: (filters: T) => void;
}

interface UseFiltersReturn<T> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (filters: T) => void;
  resetFilters: () => void;
}

export function useFilters<T extends Record<string, any>>({
  initialFilters,
  onFiltersChange
}: UseFiltersProps<T>): UseFiltersReturn<T> {
  const [filters, setFilters] = useState<T>(initialFilters || {} as T);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [filters, onFiltersChange]);

  const handleSetFilters = useCallback((newFilters: T) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  const resetFilters = useCallback(() => {
    const resetFilters = initialFilters || {} as T;
    setFilters(resetFilters);
    onFiltersChange?.(resetFilters);
  }, [initialFilters, onFiltersChange]);

  return {
    filters,
    setFilter,
    setFilters: handleSetFilters,
    resetFilters
  };
}

// Hook for managing loading states with automatic timeout
interface UseLoadingReturn {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
}

export function useLoading(initialState = false): UseLoadingReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    setLoading,
    startLoading,
    stopLoading
  };
}

// Hook for local storage with JSON serialization
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Solo acceder a localStorage en el cliente
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // Solo acceder a localStorage en el cliente
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}