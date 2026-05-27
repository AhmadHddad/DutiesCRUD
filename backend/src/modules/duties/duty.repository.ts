import { Pool } from 'pg';

import { Duty, DutyInput, DutyListPage, DutyListQuery, DutyRepository } from './duty.types';

interface DutyRow {
  id: string;
  name: string;
}

interface CountRow {
  count: string;
}

export class PgDutyRepository implements DutyRepository {
  public constructor(private readonly pool: Pool) {}

  public async findAll(query: DutyListQuery): Promise<DutyListPage> {
    const client = await this.pool.connect();

    try {
      // REPEATABLE READ guarantees both queries see the same snapshot,
      // so items, total, and nextOffset stay internally consistent.
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

      const [pageResult, countResult] = await Promise.all([
        client.query<DutyRow>(
          `
            SELECT id::text, name
            FROM duties
            ORDER BY created_at DESC, id DESC
            LIMIT $1
            OFFSET $2
          `,
          [query.limit, query.offset]
        ),
        client.query<CountRow>(
          `
            SELECT COUNT(*)::text AS count
            FROM duties
          `
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
        RETURNING id::text, name
      `,
      [input.name]
    );

    const row = result.rows[0];
    if (!row) throw new Error('INSERT into duties returned no row');
    return row as Duty;
  }

  public async update(id: string, input: DutyInput): Promise<Duty | null> {
    const result = await this.pool.query<DutyRow>(
      `
        UPDATE duties
        SET name = $1
        WHERE id = $2
        RETURNING id::text, name
      `,
      [input.name, id]
    );

    return result.rows[0] ?? null;
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
