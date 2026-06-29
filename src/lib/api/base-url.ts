import { logger } from '../logger';
import { normalizeApiBaseUrl, usesBrowserApiProxy } from '../api-config';

function normalizeBaseUrl(url: string): string {
  return normalizeApiBaseUrl(url);
}

/**
 * En el navegador, rutas /api/* deben ser same-origin (/api/...) para CSP (img-src)
 * y cookies. Convierte URLs guardadas como http://localhost:4000/api/...
 */
export function toSameOriginApiUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/')) return url;
  if (typeof window === 'undefined') return url;

  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith('/api/')) {
      return url;
    }

    const isLocalDevBackend =
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (parsed.port === '4000' || parsed.port === '');

    if (usesBrowserApiProxy() || isLocalDevBackend) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // URL relativa u otro formato
  }

  return url;
}

// SSR usa INTERNAL_API_URL directo; el navegador usa proxy same-origin cuando aplica.
const getApiBaseUrl = (): string => {
  const isServer = typeof window === 'undefined';
  const publicUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  const internalUrl = normalizeBaseUrl(process.env.INTERNAL_API_URL || '');

  if (isServer) {
    if (internalUrl) return internalUrl;
    if (publicUrl) return publicUrl;

    if (process.env.NODE_ENV === 'development') {
      logger.warn('INTERNAL_API_URL no está configurada, usando localhost:4000 como fallback para SSR');
      return 'http://localhost:4000';
    }

    throw new Error('Configura INTERNAL_API_URL o NEXT_PUBLIC_API_URL para el runtime del servidor.');
  }

  if (usesBrowserApiProxy()) {
    return '';
  }

  if (publicUrl) {
    return publicUrl;
  }

  if (process.env.NODE_ENV === 'development') {
    logger.warn('NEXT_PUBLIC_API_URL no está configurada, usando proxy /api → localhost:4000');
    return '';
  }

  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
  message?: string;
}
