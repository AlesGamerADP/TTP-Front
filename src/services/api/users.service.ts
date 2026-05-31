import { IUsersService } from './interfaces';
import { usersApi } from '../../lib/api';

/**
 * Servicio para gestión de usuarios
 * Abstrae la lógica de llamadas API relacionadas con usuarios
 */
export class UsersService implements IUsersService {
  async getMe(): Promise<{ data: any }> {
    return usersApi.getMe();
  }

  async getAll(): Promise<{ data: any[] }> {
    return usersApi.getAll();
  }

  async create(userData: any): Promise<{ data: any }> {
    return usersApi.create(userData) as Promise<{ data: any }>;
  }

  async update(id: string, userData: any): Promise<{ data: any }> {
    return usersApi.update(id, userData) as Promise<{ data: any }>;
  }

  async delete(id: string): Promise<void> {
    await usersApi.delete(id);
  }
}

// Instancia singleton del servicio
export const usersService = new UsersService();

