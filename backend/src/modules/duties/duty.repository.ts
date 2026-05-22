import { Pool } from 'pg';

import { Duty, DutyInput, DutyRepository } from './duty.types';

interface DutyRow {
  id: string;
  name: string;
}

export class PgDutyRepository implements DutyRepository {
  public constructor(private readonly pool: Pool) {}

  public async findAll(): Promise<Duty[]> {
    const result = await this.pool.query<DutyRow>(
      `
        SELECT id::text, name
        FROM duties
        ORDER BY created_at DESC, id DESC
      `
    );

    return result.rows;
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

    return result.rows[0] as Duty;
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
