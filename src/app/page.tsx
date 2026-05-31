import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HomeRedirectClient } from '@/components/auth/HomeRedirectClient';
import { hasSessionCookie, usesSameOriginAuth } from '@/features/auth/server/guards';

export default async function Home() {
  if (usesSameOriginAuth) {
    const cookieStore = await cookies();
    const hasSession = hasSessionCookie(cookieStore);
    redirect(hasSession ? '/dashboard' : '/login');
  }

  return <HomeRedirectClient />;
}
