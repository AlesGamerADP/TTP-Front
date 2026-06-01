import { authApi, usersApi } from '@/lib/api';
import { isAuthError, isConnectionError } from '@/lib/api-errors';
import { getBrowserContextInfo } from '@/lib/browser-context';
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

async function cacheUserProfile(user: User): Promise<void> {
  const { persistentStorage, sessionStorage } = await import('@/lib/storage');
  await persistentStorage.saveUser(user);
  sessionStorage.initSession();
}

export async function loginSession(codigo: string, password: string): Promise<User | null> {
  const response = await authApi.login(codigo, password);
  const user = mapBackendUser(response.user as BackendUserRecord);

  logger.info('Login attempt successful', { codigo, userId: user.id, role: user.role });
  currentUser = user;

  // No fallar el login si localStorage no está disponible (Safari privado, WebViews)
  await cacheUserProfile(user);

  return user;
}

export async function logoutSession(): Promise<void> {
  const userId = currentUser?.id;
  currentUser = null;

  try {
    await authApi.logout();
  } catch (error) {
    logger.error('Error during logout API call', { error, userId });
  }

  const { clearAllStorage, cookieStorage } = await import('@/lib/storage');
  const { setAccessToken } = await import('@/lib/auth-token');
  setAccessToken(null);
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

  const { persistentStorage, cookieStorage } = await import('@/lib/storage');
  const browserContext = getBrowserContextInfo();

  try {
    // Fuente de verdad: cookies httpOnly validadas en el servidor
    const response = await usersApi.getMe();
    const user = mapBackendUser(response.data as BackendUserRecord);

    currentUser = user;
    await cacheUserProfile(user);
    cookieStorage.invalidateCache();
    logger.debug('User restored from backend session', { userId: user.id });
    return currentUser;
  } catch (sessionError) {
    if (isAuthError(sessionError)) {
      logger.warn('Sesión inválida en el servidor, limpiando caché local', {
        error: sessionError instanceof Error ? sessionError.message : sessionError,
      });
      persistentStorage.removeUser();
      currentUser = null;
      cookieStorage.invalidateCache();
      return null;
    }

    if (isConnectionError(sessionError) && !browserContext.isRestrictedSessionContext) {
      const cachedUser = await persistentStorage.getUser();
      if (cachedUser) {
        currentUser = {
          ...cachedUser,
          role: normalizeUserRole(cachedUser.role),
        };
        logger.debug('Usando perfil en caché por error de red (sin validar cookies)', {
          userId: currentUser.id,
        });
        return currentUser;
      }
    }

    logger.debug('No active backend session', { error: sessionError });
    cookieStorage.invalidateCache();
  }

  return null;
}

