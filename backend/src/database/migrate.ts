import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

import { loadConfig } from '../config/env';
import { logger } from '../utils/logger';

async function migrate(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const migrationsDirectory = path.resolve(process.cwd(), 'src', 'database', 'migrations');
    const migrationFiles = (await fs.readdir(migrationsDirectory))
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort();

    for (const migrationFile of migrationFiles) {
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [migrationFile]);

      if ((applied.rowCount ?? 0) > 0) {
        logger.info('migration_skipped', { migration: migrationFile });
        continue;
      }

      const migrationSql = await fs.readFile(path.join(migrationsDirectory, migrationFile), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(migrationSql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationFile]);
        await client.query('COMMIT');
        logger.info('migration_applied', { migration: migrationFile });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  logger.error('migration_failed', { error });
  process.exitCode = 1;
});
