import type { NextRequest } from 'next/server';
import { usesBrowserApiProxy } from '@/lib/api-config';

export const usesSameOriginAuth = usesBrowserApiProxy();

type CookieSource =
  | NextRequest
  | {
      has: (name: string) => boolean;
    };

export function hasSessionCookie(
  source: CookieSource,
): boolean {
  if ('cookies' in source) {
    return source.cookies.has('authToken') || source.cookies.has('refreshToken');
  }

  return source.has('authToken') || source.has('refreshToken');
}
