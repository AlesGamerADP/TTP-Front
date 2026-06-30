import { cookies } from 'next/headers';
import { hasSessionCookie, usesSameOriginAuth } from '@/features/auth/server/guards';
import LoginClientPage from './LoginClientPage';

export default async function LoginPage() {
  let hasSession = false;

  if (usesSameOriginAuth) {
    const cookieStore = await cookies();
    hasSession = hasSessionCookie(cookieStore);
  }

  return <LoginClientPage hasSessionCookie={hasSession} />;
}
