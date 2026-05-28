/// <reference types="jest" />

import type { Pool } from 'pg';

import { PgDutyRepository } from './duty.repository';

type QueryResult = { rows: unknown[] };
type MockQuery = jest.Mock<Promise<QueryResult>, [string, unknown[]?]>;

interface MockClient {
  query: MockQuery;
  release: jest.Mock<void, []>;
}

interface MockPool {
  connect: jest.Mock<Promise<MockClient>, []>;
  query: MockQuery;
}

type QueryStep =
  | { kind: 'resolve'; value: QueryResult }
  | { kind: 'reject'; error: Error };

function createRepositoryHarness(steps: QueryStep[]) {
  const query: MockQuery = jest.fn();
  for (const step of steps) {
    if (step.kind === 'resolve') {
      query.mockResolvedValueOnce(step.value);
      continue;
    }

    query.mockRejectedValueOnce(step.error);
  }

  const client: MockClient = {
    query,
    release: jest.fn(),
  };
  const pool: MockPool = {
    connect: jest.fn().mockResolvedValue(client),
    query: query,
  };

  return {
    repository: new PgDutyRepository(pool as unknown as Pool),
    pool,
    client,
  };
}

describe('PgDutyRepository', () => {
  it('returns a paginated duties page from a repeatable-read transaction', async () => {
    const { repository, pool, client } = createRepositoryHarness([
      { kind: 'resolve', value: { rows: [] } },
      {
        kind: 'resolve',
        value: {
          rows: [
            { id: '1', name: 'Plan release' },
            { id: '2', name: 'Check backups' },
          ],
        },
      },
      { kind: 'resolve', value: { rows: [{ count: '3' }] } },
      { kind: 'resolve', value: { rows: [] } },
    ]);

    await expect(repository.findAll({ limit: 2, offset: 0 })).resolves.toEqual({
      items: [
        { id: '1', name: 'Plan release' },
        { id: '2', name: 'Check backups' },
      ],
      total: 3,
      limit: 2,
      offset: 0,
      nextOffset: 2,
    });

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    expect(client.query.mock.calls[1]?.[0]).toContain('SELECT id::text, name');
    expect(client.query.mock.calls[2]?.[0]).toContain('SELECT COUNT(*)::text AS count');
    expect(client.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and rethrows the original error when a transactional query fails', async () => {
    const originalError = new Error('page query failed');
    const { repository, pool, client } = createRepositoryHarness([
      { kind: 'resolve', value: { rows: [] } },
      { kind: 'reject', error: originalError },
      { kind: 'resolve', value: { rows: [{ count: '3' }] } },
      { kind: 'resolve', value: { rows: [] } },
    ]);

    await expect(repository.findAll({ limit: 2, offset: 0 })).rejects.toBe(originalError);

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(client.query.mock.calls.map(([sql]: [string, unknown[]?]) => sql)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('preserves the original error when rollback also fails', async () => {
    const originalError = new Error('page query failed');
    const rollbackError = new Error('rollback failed');
    const { repository, client } = createRepositoryHarness([
      { kind: 'resolve', value: { rows: [] } },
      { kind: 'reject', error: originalError },
      { kind: 'resolve', value: { rows: [{ count: '3' }] } },
      { kind: 'reject', error: rollbackError },
    ]);

    await expect(repository.findAll({ limit: 2, offset: 0 })).rejects.toBe(originalError);

    expect(client.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('creates duties without altering plain-text angle brackets', async () => {
    const input = { name: 'learn about <a> and 5 < 2 and 3>2' };
    const { repository, pool } = createRepositoryHarness([
      {
        kind: 'resolve',
        value: { rows: [{ id: '1', name: input.name }] },
      },
    ]);

    await expect(repository.create(input)).resolves.toEqual({ id: '1', name: input.name });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO duties (name)'), [input.name]);
  });

  it('updates duties without altering text that looks like HTML', async () => {
    const input = { name: '<b>New name</b>' };
    const { repository, pool } = createRepositoryHarness([
      {
        kind: 'resolve',
        value: { rows: [{ id: '42', name: input.name }] },
      },
    ]);

    await expect(repository.update('42', input)).resolves.toEqual({ id: '42', name: input.name });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE duties'), [input.name, '42']);
  });
});
