export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly corsOrigin: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly rateLimitWindowMs: number;
  readonly rateLimitMaxRequests: number;
  readonly writeRateLimitMaxRequests: number;
}

const DEFAULT_DATABASE_URL = 'postgres://duties:duties@localhost:5432/duties';
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';
const DEFAULT_PORT = 4000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100;
const DEFAULT_WRITE_RATE_LIMIT_MAX_REQUESTS = 20;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = parsePort(env.PORT);
  const logLevel = parseLogLevel(env.LOG_LEVEL);

  return {
    port,
    databaseUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    corsOrigin: env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
    logLevel,
    rateLimitWindowMs: parsePositiveInt(env.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS),
    rateLimitMaxRequests: parsePositiveInt(
      env.RATE_LIMIT_MAX_REQUESTS,
      'RATE_LIMIT_MAX_REQUESTS',
      DEFAULT_RATE_LIMIT_MAX_REQUESTS
    ),
    writeRateLimitMaxRequests: parsePositiveInt(
      env.WRITE_RATE_LIMIT_MAX_REQUESTS,
      'WRITE_RATE_LIMIT_MAX_REQUESTS',
      DEFAULT_WRITE_RATE_LIMIT_MAX_REQUESTS
    )
  };
}

const isValidPort = (port: number) => !Number.isNaN(port) && Number.isInteger(port) && port >= 1 && port <= 65535;

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!isValidPort(port)) {
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

function parsePositiveInt(value: string | undefined, name: string, defaultValue: number): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${value}`);
  }

  return parsed;
}
