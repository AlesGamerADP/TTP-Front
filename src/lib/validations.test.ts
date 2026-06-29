import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createUserSchema,
  passwordSchema,
  createCompanySchema,
  createComponentSchema,
  sanitizeString,
  sanitizeObject,
} from './validations';

describe('loginSchema', () => {
  it('debe validar datos de login correctos', () => {
    const validData = {
      codigo: 'USER001',
      password: 'password123',
    };
    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it('debe rechazar codigo vacío', () => {
    const invalidData = {
      codigo: '',
      password: 'password123',
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it('debe rechazar password vacío', () => {
    const invalidData = {
      codigo: 'USER001',
      password: '',
    };
    expect(() => loginSchema.parse(invalidData)).toThrow();
  });
});

describe('createUserSchema', () => {
  it('debe validar datos de usuario correctos', () => {
    const validData = {
      email: 'test@example.com',
      full_name: 'John Doe',
      password: 'password123',
      role: 'client' as const,
    };
    expect(() => createUserSchema.parse(validData)).not.toThrow();
  });

  it('debe rechazar email inválido', () => {
    const invalidData = {
      email: 'invalid-email',
      full_name: 'John Doe',
      password: 'password123',
      role: 'client' as const,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });

  it('debe rechazar nombre muy corto', () => {
    const invalidData = {
      email: 'test@example.com',
      full_name: 'J',
      password: 'password123',
      role: 'client' as const,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });

  it('debe rechazar password muy corta', () => {
    const invalidData = {
      email: 'test@example.com',
      full_name: 'John Doe',
      password: '123',
      role: 'client' as const,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });

  it('debe rechazar password sin letras', () => {
    const invalidData = {
      email: 'test@example.com',
      full_name: 'John Doe',
      password: '12345678',
      role: 'client' as const,
    };
    expect(() => createUserSchema.parse(invalidData)).toThrow();
  });
});

describe('passwordSchema', () => {
  it('acepta password con letras y numeros', () => {
    expect(() => passwordSchema.parse('abc12345')).not.toThrow();
  });

  it('rechaza password sin numeros', () => {
    expect(() => passwordSchema.parse('abcdefgh')).toThrow();
  });
});

describe('createCompanySchema', () => {
  it('debe validar datos de empresa correctos', () => {
    const validData = {
      name: 'Empresa Test',
      contact_email: 'contact@empresa.com',
    };
    expect(() => createCompanySchema.parse(validData)).not.toThrow();
  });

  it('debe rechazar nombre muy corto', () => {
    const invalidData = {
      name: 'A',
      contact_email: 'contact@empresa.com',
    };
    expect(() => createCompanySchema.parse(invalidData)).toThrow();
  });
});

describe('createComponentSchema', () => {
  it('debe validar datos de componente correctos', () => {
    const validData = {
      serial: 'SERIAL123',
      modelo: 'Modelo X',
      fecha_ingreso: '2024-01-15',
    };
    expect(() => createComponentSchema.parse(validData)).not.toThrow();
  });

  it('debe rechazar serial vacío', () => {
    const invalidData = {
      serial: '',
      fecha_ingreso: '2024-01-15',
    };
    expect(() => createComponentSchema.parse(invalidData)).toThrow();
  });

  it('debe rechazar formato de fecha inválido', () => {
    const invalidData = {
      serial: 'SERIAL123',
      fecha_ingreso: '15-01-2024',
    };
    expect(() => createComponentSchema.parse(invalidData)).toThrow();
  });
});

describe('sanitizeString', () => {
  it('debe eliminar espacios en blanco', () => {
    expect(sanitizeString('  test  ')).toBe('test');
  });

  it('debe eliminar caracteres < y >', () => {
    expect(sanitizeString('test<script>alert("xss")</script>')).toBe('testscriptalert("xss")/script');
  });

  it('debe eliminar javascript:', () => {
    expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
  });

  it('debe eliminar event handlers', () => {
    expect(sanitizeString('onclick=alert("xss")')).toBe('alert("xss")');
  });
});

describe('sanitizeObject', () => {
  it('debe sanitizar strings en objeto', () => {
    const input = {
      name: '  test  ',
      email: 'test@example.com',
    };
    const result = sanitizeObject(input);
    expect(result.name).toBe('test');
    expect(result.email).toBe('test@example.com');
  });

  it('debe sanitizar objetos anidados', () => {
    const input = {
      user: {
        name: '  test  ',
        bio: '<script>alert("xss")</script>',
      },
    };
    const result = sanitizeObject(input);
    expect(result.user.name).toBe('test');
    expect(result.user.bio).toBe('scriptalert("xss")/script');
  });

  it('debe preservar valores no string', () => {
    const input = {
      name: 'test',
      age: 25,
      active: true,
    };
    const result = sanitizeObject(input);
    expect(result.age).toBe(25);
    expect(result.active).toBe(true);
  });
});

