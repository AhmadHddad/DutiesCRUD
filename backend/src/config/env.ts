import 'dotenv/config';

export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly corsOrigin: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly rateLimitWindowMs: number;
  readonly rateLimitMaxRequests: number;
  readonly writeRateLimitMaxRequests: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT) || 4000,
    databaseUrl: env.DATABASE_URL || 'postgres://duties:duties@localhost:5432/duties',
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    logLevel: parseLogLevel(env.LOG_LEVEL),
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 60000,
    rateLimitMaxRequests: Number(env.RATE_LIMIT_MAX_REQUESTS) || 100,
    writeRateLimitMaxRequests: Number(env.WRITE_RATE_LIMIT_MAX_REQUESTS) || 20
  };
}

function parseLogLevel(value: string | undefined): AppConfig['logLevel'] {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  return 'info';
}
