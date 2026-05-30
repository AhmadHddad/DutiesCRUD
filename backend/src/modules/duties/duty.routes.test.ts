import { afterEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';

import { createApp } from '../../app';
import { NotFoundError, PreconditionFailedError } from '../../errors/appErrors';
import { requireFound } from '../../utils/assert';
import { createDutyEtag } from './duty.etag';
import { Duty, DutyInput, DutyListPage, DutyListQuery, DutyRecord, DutyServiceContract } from './duty.types';

const FIRST_ID = '1';
const SECOND_ID = '2';
const MISSING_ID = '999999';
const healthCheckOk = async (): Promise<void> => {};

describe('duty routes', () => {
  const originalRateLimitWindowMs = process.env.RATE_LIMIT_WINDOW_MS;
  const originalRateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS;
  const originalWriteRateLimitMaxRequests = process.env.WRITE_RATE_LIMIT_MAX_REQUESTS;

  afterEach(() => {
    restoreEnv('RATE_LIMIT_WINDOW_MS', originalRateLimitWindowMs);
    restoreEnv('RATE_LIMIT_MAX_REQUESTS', originalRateLimitMaxRequests);
    restoreEnv('WRITE_RATE_LIMIT_MAX_REQUESTS', originalWriteRateLimitMaxRequests);
  });

  it('returns the duty list', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([
        { id: FIRST_ID, name: 'Plan release' },
        { id: SECOND_ID, name: 'Check backups' }
      ]),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/api/duties').expect(200);

    expect(response.body).toEqual({
      data: {
        items: [
          { id: FIRST_ID, name: 'Plan release' },
          { id: SECOND_ID, name: 'Check backups' }
        ],
        total: 2,
        limit: 50,
        offset: 0,
        nextOffset: null
      }
    });
  });

  it('supports explicit pagination values', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([
        { id: FIRST_ID, name: 'Plan release' },
        { id: SECOND_ID, name: 'Check backups' }
      ]),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/api/duties?limit=1&offset=1').expect(200);

    expect(response.body).toEqual({
      data: {
        items: [{ id: SECOND_ID, name: 'Check backups' }],
        total: 2,
        limit: 1,
        offset: 1,
        nextOffset: null
      }
    });
  });

  it('filters duties by name with case-insensitive contains matching', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([
        { id: FIRST_ID, name: 'Plan release' },
        { id: SECOND_ID, name: 'BACKUP planning' },
        { id: '3', name: 'Check backups' }
      ]),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/api/duties?name=plan').expect(200);

    expect(response.body).toEqual({
      data: {
        items: [
          { id: FIRST_ID, name: 'Plan release' },
          { id: SECOND_ID, name: 'BACKUP planning' }
        ],
        total: 2,
        limit: 50,
        offset: 0,
        nextOffset: null
      }
    });
  });

  it('returns validation errors for invalid pagination values', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/api/duties?limit=0&offset=-1').expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR'
    });
  });

  it('uses the first value for duplicate pagination parameters', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([
        { id: FIRST_ID, name: 'Plan release' },
        { id: SECOND_ID, name: 'Check backups' }
      ]),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/api/duties?limit=1&limit=2').expect(200);

    expect(response.body).toEqual({
      data: {
        items: [{ id: FIRST_ID, name: 'Plan release' }],
        total: 2,
        limit: 1,
        offset: 0,
        nextOffset: 1
      }
    });
  });

  it('uses the first value for duplicate name parameters', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([
        { id: FIRST_ID, name: 'Plan release' },
        { id: SECOND_ID, name: 'Check backups' }
      ]),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/api/duties?name=plan&name=backups').expect(200);

    expect(response.body).toEqual({
      data: {
        items: [{ id: FIRST_ID, name: 'Plan release' }],
        total: 1,
        limit: 50,
        offset: 0,
        nextOffset: null
      }
    });
  });

  it('returns validation errors for over-length name filters', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .get(`/api/duties?name=${'a'.repeat(257)}`)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Name must be 256 characters or fewer.'
    });
  });

  it('creates duties with plain-text names that include angle brackets', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .post('/api/duties')
      .send({ name: '  learn about <a> and 5 < 2 and 3>2  ' })
      .expect(201);

    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: 'learn about <a> and 5 < 2 and 3>2' }
    });
  });

  it('returns one duty with an ETag header', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Plan release' }]),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get(`/api/duties/${FIRST_ID}`).expect(200);

    expect(response.headers.etag).toBe(createDutyEtag(FIRST_ID, '1'));
    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: 'Plan release' }
    });
  });

  it('updates an existing duty with plain-text names that look like HTML', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Old name' }]),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .put(`/api/duties/${FIRST_ID}`)
      .set('If-Match', createDutyEtag(FIRST_ID, '1'))
      .send({ name: '<b>New name</b>' })
      .expect(200);

    expect(response.headers.etag).toBe(createDutyEtag(FIRST_ID, '2'));
    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: '<b>New name</b>' }
    });
  });

  it('requires If-Match for updates', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Old name' }]),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .put(`/api/duties/${FIRST_ID}`)
      .send({ name: 'New name' })
      .expect(428);

    expect(response.body.error).toMatchObject({
      code: 'PRECONDITION_REQUIRED',
      message: 'If-Match header is required.'
    });
  });

  it('returns the latest duty details when an update uses a stale ETag', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Current server name' }], { [FIRST_ID]: 2 }),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .put(`/api/duties/${FIRST_ID}`)
      .set('If-Match', createDutyEtag(FIRST_ID, '1'))
      .send({ name: 'Stale name' })
      .expect(412);

    expect(response.headers.etag).toBe(createDutyEtag(FIRST_ID, '2'));
    expect(response.body.error).toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: 'Duty has changed since you opened it. The latest duty has been loaded.',
      details: {
        latestDuty: {
          id: FIRST_ID,
          name: 'Current server name'
        }
      }
    });
  });

  it('deletes an existing duty', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Remove me' }]),
      healthCheck: healthCheckOk
    });

    await request(app).delete(`/api/duties/${FIRST_ID}`).expect(204);
  });

  it('returns validation errors with request ids', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .post('/api/duties')
      .set('x-request-id', 'test-request-id')
      .send({ name: '   ' })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Duty name is required.',
        requestId: 'test-request-id'
      }
    });
  });

  it('returns validation errors for non-string duty names', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app).post('/api/duties').send({ name: 123 }).expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Duty name is required.'
    });
  });

  it('returns validation errors for non-object request bodies', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .post('/api/duties')
      .set('Content-Type', 'application/json')
      .send('[]')
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request body must be a JSON object.'
    });
  });

  it('returns not found errors for missing duties', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .put(`/api/duties/${MISSING_ID}`)
      .set('If-Match', createDutyEtag(MISSING_ID, '1'))
      .send({ name: 'Still missing' })
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Duty was not found.'
    });
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });

  it('rejects invalid duty ids before they reach the service', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app)
      .put('/api/duties/not-a-number')
      .send({ name: 'Still missing' })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Duty id must be a positive integer.'
    });
  });

  it('returns health information', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'ok'
    });
  });

  it('returns rate-limited errors using the standard envelope', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.WRITE_RATE_LIMIT_MAX_REQUESTS = '1';

    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: healthCheckOk
    });

    await request(app).post('/api/duties').send({ name: 'First request' }).expect(201);

    const response = await request(app)
      .post('/api/duties')
      .set('x-request-id', 'rate-limit-request')
      .send({ name: 'Second request' })
      .expect(429);

    expect(response.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many write requests. Please slow down.',
        requestId: 'rate-limit-request'
      }
    });
  });
});

class InMemoryDutyService implements DutyServiceContract {
  private readonly duties = new Map<string, DutyRecord>();
  private nextIdIndex = 0;

  public constructor(seed: Duty[] = [], versions: Record<string, number> = {}) {
    for (const duty of seed) {
      this.duties.set(duty.id, {
        ...duty,
        version: String(versions[duty.id] ?? 1)
      });
    }
  }

  public async listDuties(query: DutyListQuery): Promise<DutyListPage> {
    const normalizedName = query.name?.toLocaleLowerCase();
    const allDuties = Array.from(this.duties.values());
    const filteredDuties =
      !normalizedName
        ? allDuties
        : allDuties.filter((duty) => duty.name.toLocaleLowerCase().includes(normalizedName));
    const items = filteredDuties
      .slice(query.offset, query.offset + query.limit)
      .map(toDuty);
    const total = filteredDuties.length;
    const hasNextPage = query.offset + items.length < total;
    const nextOffset = hasNextPage ? query.offset + items.length : null;

    return {
      items,
      total,
      limit: query.limit,
      offset: query.offset,
      nextOffset
    };
  }

  public async createDuty(input: DutyInput): Promise<Duty> {
    const id = [FIRST_ID, SECOND_ID][this.nextIdIndex] ?? String(this.nextIdIndex + 3);
    this.nextIdIndex += 1;
    const duty = { id, name: input.name, version: '1' };
    this.duties.set(id, duty);
    return toDuty(duty);
  }

  public async getDuty(id: string): Promise<DutyRecord> {
    return requireFound(this.duties.get(id) ?? null, 'Duty was not found.');
  }

  public async updateDuty(id: string, input: DutyInput, expectedVersion: string): Promise<DutyRecord> {
    const currentDuty = requireFound(this.duties.get(id) ?? null, 'Duty was not found.');

    if (currentDuty.version !== expectedVersion) {
      throw new PreconditionFailedError('Duty has changed since you opened it. The latest duty has been loaded.', {
        details: {
          latestDuty: toDuty(currentDuty)
        },
        headers: {
          ETag: createDutyEtag(currentDuty.id, currentDuty.version)
        }
      });
    }

    const duty = {
      id,
      name: input.name,
      version: String(Number(currentDuty.version) + 1)
    };
    this.duties.set(id, duty);
    return duty;
  }

  public async deleteDuty(id: string): Promise<void> {
    if (!this.duties.delete(id)) {
      throw new NotFoundError('Duty was not found.');
    }
  }
}

function toDuty(duty: DutyRecord): Duty {
  return {
    id: duty.id,
    name: duty.name
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
