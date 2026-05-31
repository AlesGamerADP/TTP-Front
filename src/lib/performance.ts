/**
 * Utilidades para optimización de rendimiento
 */

/**
 * Preload crítico de recursos
 */
export function preloadCritical() {
  if (typeof window === 'undefined') return;

  // Preload de fuentes críticas si es necesario
  const preloadLink = document.createElement('link');
  preloadLink.rel = 'preload';
  preloadLink.as = 'font';
  preloadLink.type = 'font/woff2';
  preloadLink.crossOrigin = 'anonymous';
  // Agregar aquí las fuentes críticas si las tienes
}

/**
 * Debounce function para optimizar llamadas frecuentes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function para limitar ejecuciones
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load de módulos con retry
 */
export async function lazyLoadWithRetry<T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return lazyLoadWithRetry(importFn, retries - 1, delay);
    }
    throw error;
  }
}

/**
 * Batch de operaciones asíncronas
 */
export async function batchAsync<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  
  return results;
}

