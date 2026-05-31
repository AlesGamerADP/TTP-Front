import { IAuthService } from './interfaces';
import { authApi } from '../../lib/api';

/**
 * Servicio para autenticación
 * Abstrae la lógica de llamadas API relacionadas con autenticación
 */
export class AuthService implements IAuthService {
  async login(codigo: string, password: string): Promise<{ token: string; refreshToken: string; user: any }> {
    const response = await authApi.login(codigo, password);
    // Los tokens están en cookies httpOnly, retornamos valores vacíos para compatibilidad
    return {
      token: '',
      refreshToken: '',
      user: response.user,
    };
  }

  async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    await authApi.refresh();
    // Los tokens están en cookies httpOnly, retornamos valores vacíos para compatibilidad
    return {
      token: '',
      refreshToken: '',
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    return authApi.logout();
  }
}

// Instancia singleton del servicio
export const authService = new AuthService();

