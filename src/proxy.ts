import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { hasSessionCookie, usesSameOriginAuth } from '@/features/auth/server/guards';

const PROTECTED_PREFIXES = ['/dashboard', '/components'];

export function proxy(request: NextRequest) {
  if (!usesSameOriginAuth) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const hasSession = hasSessionCookie(request);

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // No redirigir /login → /dashboard solo por existir cookies: pueden estar
  // caducadas y provocar bucle con el cliente (401 en /api/users/me).
  // useAuthGate en modo guest redirige tras validar sesión con el backend.

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/components/:path*', '/login'],
};
