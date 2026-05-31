import { z } from 'zod';
import { API_USER_ROLES } from './roles';

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128)
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');

// Schema de validación para login
export const loginSchema = z.object({
  codigo: z.string().min(1, 'El código de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Schema de validación para crear usuario
export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  password: passwordSchema.optional(),
  role: z.enum(API_USER_ROLES),
  company_id: z.string().uuid().optional().nullable(),
  access_code: z.string().optional(),
  auth_user_id: z.string().optional(),
});

// Schema de validación para crear empresa
export const createCompanySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  contact_email: z.string().email('Email inválido'),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
});

// Schema de validación para crear componente
export const createComponentSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  serial: z.string().min(1, 'El número de serie es requerido'),
  modelo: z.string().optional(),
  fecha_ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  ite: z.string().optional(),
  numero_cotizacion: z.string().optional(),
  observaciones: z.string().optional(),
});

// Función helper para sanitizar strings
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, ''); // Remover event handlers
}

// Función helper para sanitizar objetos
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as any)[key] = sanitizeObject(value);
    }
  }
  return sanitized;
}

