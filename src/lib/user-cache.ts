import type { User } from '@/features/auth/model';

/** Perfil mínimo en caché: sin credenciales ni tokens (solo UX offline). */
export type CachedUserProfile = Omit<User, 'access_code'>;

export function toCachedUserProfile(user: User): CachedUserProfile {
  const { access_code: _accessCode, ...profile } = user;
  return profile;
}

export function mergeCachedUserProfile(cached: CachedUserProfile): User {
  return { ...cached, access_code: undefined };
}
