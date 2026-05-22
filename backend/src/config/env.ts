export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly corsOrigin: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_DATABASE_URL = 'postgres://duties:duties@localhost:5432/duties';
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';
const DEFAULT_PORT = 4000;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = parsePort(env.PORT);
  const logLevel = parseLogLevel(env.LOG_LEVEL);

  return {
    port,
    databaseUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    corsOrigin: env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
    logLevel
  };
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535. Received: ${value}`);
  }

  return port;
}

function parseLogLevel(value: string | undefined): AppConfig['logLevel'] {
  if (value === undefined || value.trim() === '') {
    return 'info';
  }

  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }

  throw new Error(`LOG_LEVEL must be one of debug, info, warn, error. Received: ${value}`);
}
