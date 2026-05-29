import { Pool } from 'pg';

import { loadConfig } from '../config/env';
import { logger } from '../utils/logger';

export const DEFAULT_SEED_COUNT = 1_000_000;

const COUNT_ARGUMENT_PREFIX = '--count=';

export function parseSeedCount(argv: string[]): number {
  let count = DEFAULT_SEED_COUNT;
  let hasCountOverride = false;

  for (const argument of argv.slice(2)) {
    if (argument.startsWith(COUNT_ARGUMENT_PREFIX)) {
      if (hasCountOverride) {
        throw new Error('Seed count can only be provided once.');
      }

      const rawValue = argument.slice(COUNT_ARGUMENT_PREFIX.length);
      if (rawValue.length === 0) {
        throw new Error('Seed count must be provided as --count=<positive integer>.');
      }

      if (!/^\d+$/.test(rawValue)) {
        throw new Error('Seed count must be a positive integer.');
      }

      const parsedCount = Number(rawValue);
      if (!Number.isSafeInteger(parsedCount) || parsedCount <= 0) {
        throw new Error('Seed count must be a positive safe integer.');
      }

      count = parsedCount;
      hasCountOverride = true;
      continue;
    }

    if (argument.startsWith('--')) {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return count;
}

async function seedDatabase(): Promise<void> {
  const count = parseSeedCount(process.argv);
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const startedAt = Date.now();

  logger.info('database_seeding_started', { count });

  try {
    // Generate the dataset inside PostgreSQL so large seeds avoid Node-side loops.
    const result = await pool.query(
      `
        WITH seed_base AS (
          SELECT COALESCE(MAX(id), 0)::bigint AS base_id
          FROM duties
        )
        INSERT INTO duties (name)
        SELECT 'Seed duty ' || (seed_base.base_id + generated.n)::text
        FROM seed_base
        CROSS JOIN generate_series(1::bigint, $1::bigint) AS generated(n)
      `,
      [count]
    );

    logger.info('database_seeding_completed', {
      count,
      insertedRows: result.rowCount ?? count,
      durationMs: Date.now() - startedAt
    });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase().catch((error: unknown) => {
    logger.error('database_seeding_failed', { error });
    process.exitCode = 1;
  });
}
