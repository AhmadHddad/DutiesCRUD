import { loadConfig } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

const severity: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function createLogger(level: LogLevel = loadConfig().logLevel): Logger {
  function write(logLevel: LogLevel, message: string, meta: LogMeta = {}): void {
    if (severity[logLevel] < severity[level]) {
      return;
    }

    const payload = {
      level: logLevel,
      message,
      timestamp: new Date().toISOString(),
      ...normalizeMeta(meta)
    };

    const line = JSON.stringify(payload);

    if (logLevel === 'error') {
      console.error(line);
      return;
    }

    if (logLevel === 'warn') {
      console.warn(line);
      return;
    }

    console.log(line);
  }

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta)
  };
}

export const logger = createLogger();

function normalizeMeta(meta: LogMeta): LogMeta {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (value instanceof Error) {
        return [
          key,
          {
            name: value.name,
            message: value.message,
            stack: value.stack
          }
        ];
      }

      return [key, value];
    })
  );
}
