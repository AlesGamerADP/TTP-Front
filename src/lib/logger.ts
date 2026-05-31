type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry = this.formatMessage(level, message, context);
    
    if (!this.isDevelopment && level === 'debug') {
      return;
    }

    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    
    if (context) {
      logMethod(prefix, message, context);
    } else {
      logMethod(prefix, message);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }
}

export const logger = new Logger();

