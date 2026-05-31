import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { hasSessionCookie, usesSameOriginAuth } from '@/features/auth/server/guards';

const PROTECTED_PREFIXES = ['/dashboard', '/components'];
const AUTH_PAGES = new Set(['/login']);

export function proxy(request: NextRequest) {
  if (!usesSameOriginAuth) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.has(pathname);
  const hasSession = hasSessionCookie(request);

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/components/:path*', '/login'],
};
