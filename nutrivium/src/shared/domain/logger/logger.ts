type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
  if (envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return 'info';
}

const CURRENT_LOG_LEVEL = getLogLevel();

export class Logger {
  private static shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
  }

  static debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      // 🐞 para debug
      console.debug('🐞 [DEBUG]', ...args);
    }
  }

  static info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      // ℹ️ para info
      console.info('ℹ️ [INFO]', ...args);
    }
  }

  static warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      // ⚠️ para warning
      console.warn('⚠️ [WARN]', ...args);
    }
  }

  static error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      // ❌ para error
      console.error('❌ [ERROR]', ...args);
    }
  }
}

export const logger = Logger;
