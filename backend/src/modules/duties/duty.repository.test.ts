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
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SELECT id::text, name'),
      [2, 0, null],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT COUNT(*)::text AS count'),
      [null],
    );
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
        value: { rows: [{ id: '1', name: input.name, version: '1' }] },
      },
    ]);

    await expect(repository.create(input)).resolves.toEqual({ id: '1', name: input.name });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO duties (name)'), [input.name]);
  });

  it('filters duties by a case-insensitive literal name pattern', async () => {
    const { repository, client } = createRepositoryHarness([
      { kind: 'resolve', value: { rows: [] } },
      {
        kind: 'resolve',
        value: {
          rows: [{ id: '2', name: 'Plan release' }],
        },
      },
      { kind: 'resolve', value: { rows: [{ count: '1' }] } },
      { kind: 'resolve', value: { rows: [] } },
    ]);

    await expect(repository.findAll({ limit: 1, offset: 0, name: 'plan' })).resolves.toEqual({
      items: [{ id: '2', name: 'Plan release' }],
      total: 1,
      limit: 1,
      offset: 0,
      nextOffset: null,
    });

    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('name ILIKE $3'),
      [1, 0, '%plan%'],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('name ILIKE $1'),
      ['%plan%'],
    );
  });

  it('escapes wildcard characters in the name filter', async () => {
    const { repository, client } = createRepositoryHarness([
      { kind: 'resolve', value: { rows: [] } },
      {
        kind: 'resolve',
        value: {
          rows: [{ id: '7', name: '100%_ready\\done' }],
        },
      },
      { kind: 'resolve', value: { rows: [{ count: '1' }] } },
      { kind: 'resolve', value: { rows: [] } },
    ]);

    await repository.findAll({ limit: 10, offset: 0, name: '100%_ready\\done' });

    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      [10, 0, '%100\\%\\_ready\\\\done%'],
    );
    expect(client.query).toHaveBeenNthCalledWith(3, expect.any(String), ['%100\\%\\_ready\\\\done%']);
  });

  it('finds one duty with its version', async () => {
    const { repository, pool } = createRepositoryHarness([
      {
        kind: 'resolve',
        value: { rows: [{ id: '42', name: 'Plan release', version: '3' }] },
      },
    ]);

    await expect(repository.findById('42')).resolves.toEqual({ id: '42', name: 'Plan release', version: '3' });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id::text, name, version::text'), ['42']);
  });

  it('updates duties conditionally when the expected version matches', async () => {
    const input = { name: '<b>New name</b>' };
    const { repository, pool } = createRepositoryHarness([
      {
        kind: 'resolve',
        value: { rows: [{ id: '42', name: input.name, version: '6' }] },
      },
    ]);

    await expect(repository.update('42', input, '5')).resolves.toEqual({
      duty: { id: '42', name: input.name, version: '6' },
      conflictDuty: null,
    });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('AND version = $3::bigint'), [input.name, '42', '5']);
  });

  it('returns the latest duty when a conditional update hits a stale version', async () => {
    const input = { name: 'New name' };
    const { repository, pool } = createRepositoryHarness([
      {
        kind: 'resolve',
        value: { rows: [] },
      },
      {
        kind: 'resolve',
        value: { rows: [{ id: '42', name: 'Current server name', version: '8' }] },
      },
    ]);

    await expect(repository.update('42', input, '7')).resolves.toEqual({
      duty: null,
      conflictDuty: { id: '42', name: 'Current server name', version: '8' },
    });

    expect(pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('UPDATE duties'), [input.name, '42', '7']);
    expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT id::text, name, version::text'), ['42']);
  });
});
