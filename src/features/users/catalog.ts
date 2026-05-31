import { usersApi } from '@/lib/api';
import { logger } from '@/lib/logger';

type UserLabelRecord = {
  id: string;
  label: string;
};

let usersCache: UserLabelRecord[] | null = null;
let usersLoading: Promise<UserLabelRecord[]> | null = null;

function mapUserLabel(user: {
  id: string;
  full_name?: string | null;
  access_code?: string | null;
  auth_user_id?: string | null;
  codigo?: string | null;
}): UserLabelRecord {
  const label =
    user.full_name?.trim() ||
    user.access_code?.trim() ||
    user.auth_user_id?.trim() ||
    user.codigo?.trim() ||
    user.id;

  return { id: user.id, label };
}

export async function loadUsersCatalog(): Promise<UserLabelRecord[]> {
  if (usersCache) return usersCache;
  if (usersLoading) return usersLoading;

  usersLoading = (async () => {
    try {
      const response = await usersApi.getAll();
      usersCache = (response.data || []).map(mapUserLabel);
      return usersCache;
    } catch (error) {
      logger.error('Error loading users catalog', { error });
      return usersCache ?? [];
    } finally {
      usersLoading = null;
    }
  })();

  return usersLoading;
}

export function getUserDisplayName(userId: string): string {
  const user = usersCache?.find((item) => item.id === userId);
  return user?.label || userId;
}

export function invalidateUsersCatalog(): void {
  usersCache = null;
}
