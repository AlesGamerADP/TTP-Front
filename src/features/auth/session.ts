import { authApi, usersApi } from '@/lib/api';
import { usesBrowserApiProxy } from '@/lib/api-config';
import { setAccessToken } from '@/lib/auth-token';
import { logger } from '@/lib/logger';
import { normalizeUserRole } from '@/lib/roles';
import type { User } from './model';

let currentUser: User | null = null;

type BackendUserRecord = {
  id: string;
  company_id?: string | null;
  company?: User['company'];
  codigo?: string | null;
  access_code?: string | null;
  auth_user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  role: string;
  is_active?: boolean;
  created_at?: string | null;
  created_by?: string | null;
  last_login?: string | null;
};

function mapBackendUser(backendUser: BackendUserRecord): User {
  return {
    id: backendUser.id,
    company_id: backendUser.company_id || backendUser.company?.id || '',
    codigo: backendUser.codigo || backendUser.access_code || backendUser.auth_user_id || '',
    email: backendUser.email || undefined,
    full_name: backendUser.full_name || undefined,
    role: normalizeUserRole(backendUser.role),
    company: backendUser.company,
    access_code: backendUser.access_code || undefined,
    is_active: backendUser.is_active,
    created_at: backendUser.created_at || new Date().toISOString(),
    created_by: backendUser.created_by || undefined,
    last_login: backendUser.last_login || undefined,
  };
}

export async function loginSession(codigo: string, password: string): Promise<User | null> {
  try {
    const response = await authApi.login(codigo, password);
    if (!usesBrowserApiProxy() && response.accessToken) {
      setAccessToken(response.accessToken);
    }
    const user = mapBackendUser(response.user as BackendUserRecord);

    logger.info('Login attempt successful', { codigo, userId: user.id, role: user.role });
    currentUser = user;

    const { sessionStorage, persistentStorage } = await import('@/lib/storage');
    sessionStorage.initSession();
    persistentStorage.removeLegacyUserCache();

    return user;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Login attempt failed', {
      codigo,
      error: errorMessage,
      errorType: error instanceof Error ? error.name : undefined,
      errorDetails:
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : error,
    });
    throw error;
  }
}

export async function logoutSession(): Promise<void> {
  const userId = currentUser?.id;
  currentUser = null;

  try {
    await authApi.logout();
  } catch (error) {
    logger.warn('Error during logout API call', { error, userId });
  }

  const { clearAllStorage, cookieStorage } = await import('@/lib/storage');
  clearAllStorage();
  cookieStorage.invalidateCache();

  logger.info('User session cleared', { userId });
}

export async function getCurrentSessionUser(): Promise<User | null> {
  if (currentUser) {
    return currentUser;
  }
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { cookieStorage, persistentStorage } = await import('@/lib/storage');
    persistentStorage.removeLegacyUserCache();

    const response = await usersApi.getMe();
    const user = mapBackendUser(response.data as BackendUserRecord);

    currentUser = user;
    cookieStorage.invalidateCache();
    logger.debug('User restored from backend session', { userId: user.id });
    return currentUser;
  } catch (sessionError) {
    logger.debug('No active backend session', { error: sessionError });
    currentUser = null;

    const status = (sessionError as Error & { status?: number }).status;
    if (status === 401) {
      try {
        await authApi.logout();
      } catch {
        // Ignorar: solo intentamos limpiar cookies caducadas en el cliente
      }
    }

    const { cookieStorage } = await import('@/lib/storage');
    cookieStorage.invalidateCache();
  }

  return null;
}
