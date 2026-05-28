import { Pool } from 'pg';

import { AppConfig, loadConfig } from '../config/env';

let pool: Pool | undefined;

export function getPool(config: AppConfig = loadConfig()): Pool {
  // The pool is process-wide: once it is created, later calls reuse the same
  // instance and ignore any different config passed by later callers.
  if (pool === undefined) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool !== undefined) {
    await pool.end();
    pool = undefined;
  }
}
