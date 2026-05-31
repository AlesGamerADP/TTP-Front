import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (className utility)', () => {
  it('debe combinar clases correctamente', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('debe manejar clases condicionales', () => {
    expect(cn('base', true && 'conditional')).toBe('base conditional');
    expect(cn('base', false && 'conditional')).toBe('base');
  });

  it('debe manejar arrays de clases', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2');
  });

  it('debe filtrar valores falsy', () => {
    expect(cn('base', null, undefined, false, 'valid')).toBe('base valid');
  });

  it('debe manejar objetos de clases condicionales', () => {
    expect(cn({ base: true, conditional: false, other: true })).toBe('base other');
  });
});

