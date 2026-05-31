/**
 * Sistema de almacenamiento híbrido
 * 
 * Estrategia:
 * - Cookies httpOnly: Tokens de autenticación (manejadas por el backend)
 * - localStorage: Datos del usuario que persisten entre sesiones
 * - sessionStorage: Datos temporales de la sesión actual
 */

import { logger } from './logger';

// ============================================
// KEYS DE STORAGE
// ============================================

const STORAGE_KEYS = {
  // localStorage - Datos persistentes
  CURRENT_USER: 'currentUser',
  USER_PREFERENCES: 'userPreferences',
  LAST_LOGIN: 'lastLogin',
  
  // sessionStorage - Datos temporales
  SESSION_ID: 'sessionId',
  UI_STATE: 'uiState',
  TEMP_DATA: 'tempData',
} as const;

// ============================================
// TIPOS
// ============================================

interface UserPreferences {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: boolean;
}

interface UIState {
  sidebarOpen?: boolean;
  lastVisitedPage?: string;
  filters?: Record<string, any>;
}

// ============================================
// LOCALSTORAGE - Datos Persistentes
// ============================================

export const persistentStorage = {
  /**
   * Guardar usuario en localStorage (encriptado)
   */
  async saveUser(user: any): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const { encrypt } = await import('./encryption');
      const encryptedUser = await encrypt(JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, encryptedUser);
      localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      
      logger.debug('User saved to localStorage', { userId: user.id });
    } catch (error) {
      logger.error('Failed to save user to localStorage', { error });
      throw error;
    }
  },

  /**
   * Obtener usuario de localStorage
   */
  async getUser(): Promise<any | null> {
    try {
      if (typeof window === 'undefined') return null;
      
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!stored) return null;
      
      try {
        // Intentar desencriptar
        const { decrypt } = await import('./encryption');
        const decrypted = await decrypt(stored);
        return JSON.parse(decrypted);
      } catch (decryptError) {
        logger.error('Encrypted user payload could not be decrypted', { error: decryptError });
        this.removeUser();
        return null;
      }
    } catch (error) {
      logger.error('Error loading user from localStorage', { error });
      return null;
    }
  },

  /**
   * Eliminar usuario de localStorage
   */
  removeUser(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
      logger.debug('User removed from localStorage');
    } catch (error) {
      logger.error('Failed to remove user from localStorage', { error });
    }
  },

  /**
   * Guardar preferencias del usuario
   */
  savePreferences(preferences: UserPreferences): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      logger.error('Failed to save preferences', { error });
    }
  },

  /**
   * Obtener preferencias del usuario
   */
  getPreferences(): UserPreferences | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      logger.error('Error loading preferences', { error });
      return null;
    }
  },

  /**
   * Obtener última fecha de login
   */
  getLastLogin(): Date | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
      return stored ? new Date(stored) : null;
    } catch (error) {
      return null;
    }
  },
};

// ============================================
// SESSIONSTORAGE - Datos Temporales
// ============================================

export const sessionStorage = {
  /**
   * Inicializar sesión
   */
  initSession(): string {
    try {
      if (typeof window === 'undefined') return '';
      
      let sessionId = window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        window.sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
        logger.debug('New session initialized', { sessionId });
      }
      return sessionId;
    } catch (error) {
      logger.error('Failed to init session', { error });
      return '';
    }
  },

  /**
   * Obtener ID de sesión
   */
  getSessionId(): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      return null;
    }
  },

  /**
   * Guardar estado de UI
   */
  saveUIState(state: UIState): void {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify(state));
    } catch (error) {
      logger.error('Failed to save UI state', { error });
    }
  },

  /**
   * Obtener estado de UI
   */
  getUIState(): UIState | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = window.sessionStorage.getItem(STORAGE_KEYS.UI_STATE);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      logger.error('Error loading UI state', { error });
      return null;
    }
  },

  /**
   * Guardar datos temporales
   */
  setTempData(key: string, value: any): void {
    try {
      if (typeof window === 'undefined') return;
      const tempData = this.getTempData();
      tempData[key] = value;
      window.sessionStorage.setItem(STORAGE_KEYS.TEMP_DATA, JSON.stringify(tempData));
    } catch (error) {
      logger.error('Failed to save temp data', { error, key });
    }
  },

  /**
   * Obtener datos temporales
   */
  getTempData(): Record<string, any> {
    try {
      if (typeof window === 'undefined') return {};
      const stored = window.sessionStorage.getItem(STORAGE_KEYS.TEMP_DATA);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  },

  /**
   * Limpiar datos temporales
   */
  clearTempData(): void {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.removeItem(STORAGE_KEYS.TEMP_DATA);
    } catch (error) {
      logger.error('Failed to clear temp data', { error });
    }
  },

  /**
   * Limpiar toda la sesión
   */
  clearSession(): void {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.clear();
      logger.debug('Session cleared');
    } catch (error) {
      logger.error('Failed to clear session', { error });
    }
  },
};

// ============================================
// COOKIES - Verificación (las cookies httpOnly se manejan en el backend)
// ============================================

// Cache para verificación de cookies (evitar requests repetidos)
let cookieCheckCache: { valid: boolean; timestamp: number } | null = null;
const COOKIE_CHECK_CACHE_TTL = 30 * 1000; // 30 segundos

export const cookieStorage = {
  /**
   * Verificar si hay cookie de autenticación
   * Nota: No podemos leer cookies httpOnly desde JavaScript,
   * pero podemos verificar si existen haciendo una request
   * Usa cache para evitar requests repetidos
   */
  async hasAuthCookie(forceCheck: boolean = false): Promise<boolean> {
    // Usar cache si está disponible y no es forzado
    if (!forceCheck && cookieCheckCache) {
      const now = Date.now();
      if (now - cookieCheckCache.timestamp < COOKIE_CHECK_CACHE_TTL) {
        return cookieCheckCache.valid;
      }
    }
    
    try {
      // Hacer una request simple para verificar si las cookies se envían
      // Si el backend responde con 200, significa que hay cookie válida
      const { API_BASE_URL } = await import('./api');
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const isValid = response.ok;
      
      // Actualizar cache
      cookieCheckCache = {
        valid: isValid,
        timestamp: Date.now(),
      };
      
      return isValid;
    } catch (error) {
      // En caso de error, asumir que no hay cookie válida
      cookieCheckCache = {
        valid: false,
        timestamp: Date.now(),
      };
      return false;
    }
  },

  /**
   * Invalidar el cache de verificación de cookies
   */
  invalidateCache(): void {
    cookieCheckCache = null;
  },
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Limpiar todo el almacenamiento (logout completo)
 */
export function clearAllStorage(): void {
  persistentStorage.removeUser();
  sessionStorage.clearSession();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-storage');
  }
  logger.info('All storage cleared');
}

/**
 * Inicializar almacenamiento al cargar la app
 */
export function initStorage(): void {
  sessionStorage.initSession();
  logger.debug('Storage initialized');
}

