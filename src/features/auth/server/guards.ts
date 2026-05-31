import type { NextRequest } from 'next/server';

export const usesSameOriginAuth =
  !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL === '/';

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
