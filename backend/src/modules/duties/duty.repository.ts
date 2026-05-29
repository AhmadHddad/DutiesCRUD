import { Pool } from 'pg';

import { Duty, DutyInput, DutyListPage, DutyListQuery, DutyRecord, DutyRepository, DutyUpdateResult } from './duty.types';

interface DutyRow {
  id: string;
  name: string;
  version: string;
}

interface CountRow {
  count: string;
}

export class PgDutyRepository implements DutyRepository {
  public constructor(private readonly pool: Pool) {}

  public async findAll(query: DutyListQuery): Promise<DutyListPage> {
    const client = await this.pool.connect();
    const filterPattern = toNameFilterPattern(query.name);

    try {
      // REPEATABLE READ guarantees both queries see the same snapshot,
      // so items, total, and nextOffset stay internally consistent.
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

      const [pageResult, countResult] = await Promise.all([
        client.query<DutyRow>(
          `
            SELECT id::text, name
            FROM duties
            WHERE ($3::text IS NULL OR name ILIKE $3)
            ORDER BY created_at DESC, id DESC
            LIMIT $1
            OFFSET $2
          `,
          [query.limit, query.offset, filterPattern]
        ),
        client.query<CountRow>(
          `
            SELECT COUNT(*)::text AS count
            FROM duties
            WHERE ($1::text IS NULL OR name ILIKE $1)
          `
          ,
          [filterPattern]
        )
      ]);

      await client.query('COMMIT');

      const total = Number(countResult.rows[0]?.count ?? '0');
      const nextOffset = query.offset + pageResult.rows.length < total ? query.offset + pageResult.rows.length : null;

      return {
        items: pageResult.rows,
        total,
        limit: query.limit,
        offset: query.offset,
        nextOffset
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original failure if rollback also fails.
      }

      throw error;
    } finally {
      client.release();
    }
  }

  public async create(input: DutyInput): Promise<Duty> {
    const result = await this.pool.query<DutyRow>(
      `
        INSERT INTO duties (name)
        VALUES ($1)
        RETURNING id::text, name, version::text
      `,
      [input.name]
    );

    const row = result.rows[0];
    if (!row) throw new Error('INSERT into duties returned no row');
    return toDuty(row);
  }

  public async findById(id: string): Promise<DutyRecord | null> {
    const result = await this.pool.query<DutyRow>(
      `
        SELECT id::text, name, version::text
        FROM duties
        WHERE id = $1
      `,
      [id]
    );

    return result.rows[0] === undefined ? null : toDutyRecord(result.rows[0]);
  }

  public async update(id: string, input: DutyInput, expectedVersion: string): Promise<DutyUpdateResult> {
    const result = await this.pool.query<DutyRow>(
      `
        UPDATE duties
        SET name = $1,
            version = version + 1
        WHERE id = $2
          AND version = $3::bigint
        RETURNING id::text, name, version::text
      `,
      [input.name, id, expectedVersion]
    );

    // This single conditional UPDATE is the core optimistic-lock check:
    // if another writer already changed the row, the version no longer matches
    // and no row is updated.
    const updatedRow = result.rows[0];
    if (updatedRow !== undefined) {
      return {
        duty: toDutyRecord(updatedRow),
        conflictDuty: null
      };
    }

    return {
      duty: null,
      conflictDuty: await this.findById(id)
    };
  }

  public async delete(id: string): Promise<Duty | null> {
    const result = await this.pool.query<DutyRow>(
      `
        DELETE FROM duties
        WHERE id = $1
        RETURNING id::text, name
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }
}

function toDuty(row: DutyRow): Duty {
  return {
    id: row.id,
    name: row.name
  };
}

function toDutyRecord(row: DutyRow): DutyRecord {
  return {
    ...toDuty(row),
    version: row.version
  };
}

function toNameFilterPattern(name: string | undefined): string | null {
  if (name === undefined) {
    return null;
  }

  return `%${escapeLikePattern(name)}%`;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
