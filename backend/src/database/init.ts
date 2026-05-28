import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

import { loadConfig } from '../config/env';
import { logger } from '../utils/logger';

async function initDatabase(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    const schemaPath = path.resolve(process.cwd(), 'src', 'database', 'schema.sql');
    const schemaSql = await readFile(schemaPath, 'utf8');

    await pool.query(schemaSql);
    logger.info('database_initialized');
  } finally {
    await pool.end();
  }
}

initDatabase().catch((error: unknown) => {
  logger.error('database_initialization_failed', { error });
  process.exitCode = 1;
});
