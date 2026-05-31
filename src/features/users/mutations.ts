import { usersApi } from '@/lib/api';

export interface CreateUserInput {
  email: string;
  full_name: string;
  role: string;
  company_id?: string;
}

export interface UpdateUserInput {
  email: string;
  full_name: string;
  role?: string;
  company_id?: string;
  access_code?: string;
  password?: string;
}

export function createUserMutation(payload: CreateUserInput) {
  return usersApi.create(payload);
}

export function updateUserMutation(userId: string, payload: UpdateUserInput) {
  return usersApi.update(userId, payload);
}

export function deleteUserMutation(userId: string) {
  return usersApi.delete(userId);
}

export function sendUserCredentialsMutation(userId: string, password: string) {
  return usersApi.sendCredentials(userId, password);
}
