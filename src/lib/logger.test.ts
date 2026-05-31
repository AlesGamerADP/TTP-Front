import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe loguear mensajes de info', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('debe loguear mensajes de warn', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Warning message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('debe loguear mensajes de error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Error message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('debe incluir contexto cuando se proporciona', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('Test message', { userId: '123', action: 'login' });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      'Test message',
      expect.objectContaining({ userId: '123', action: 'login' })
    );
    consoleSpy.mockRestore();
  });

  it('no debe loguear debug en producción', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('Debug message');
    expect(consoleSpy).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });
});

