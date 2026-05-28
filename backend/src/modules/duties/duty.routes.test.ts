import request from 'supertest';

import { createApp } from '../../app';
import { NotFoundError } from '../../errors/appErrors';
import { Duty, DutyInput, DutyListPage, DutyListQuery, DutyServiceContract } from './duty.types';

const FIRST_ID = '1';
const SECOND_ID = '2';
const MISSING_ID = '999999';

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
      healthCheck: async () => undefined
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
      healthCheck: async () => undefined
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

  it('returns validation errors for invalid pagination values', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: async () => undefined
    });

    const response = await request(app).get('/api/duties?limit=0&offset=-1').expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR'
    });
  });

  it('creates duties with plain-text names that include angle brackets', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: async () => undefined
    });

    const response = await request(app)
      .post('/api/duties')
      .send({ name: '  learn about <a> and 5 < 2 and 3>2  ' })
      .expect(201);

    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: 'learn about <a> and 5 < 2 and 3>2' }
    });
  });

  it('updates an existing duty with plain-text names that look like HTML', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Old name' }]),
      healthCheck: async () => undefined
    });

    const response = await request(app)
      .put(`/api/duties/${FIRST_ID}`)
      .send({ name: '<b>New name</b>' })
      .expect(200);

    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: '<b>New name</b>' }
    });
  });

  it('deletes an existing duty', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Remove me' }]),
      healthCheck: async () => undefined
    });

    await request(app).delete(`/api/duties/${FIRST_ID}`).expect(204);
  });

  it('returns validation errors with request ids', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: async () => undefined
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

  it('returns not found errors for missing duties', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: async () => undefined
    });

    const response = await request(app)
      .put(`/api/duties/${MISSING_ID}`)
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
      healthCheck: async () => undefined
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
      healthCheck: async () => undefined
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
      healthCheck: async () => undefined
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
  private readonly duties = new Map<string, Duty>();
  private nextIdIndex = 0;

  public constructor(seed: Duty[] = []) {
    for (const duty of seed) {
      this.duties.set(duty.id, duty);
    }
  }

  public async listDuties(query: DutyListQuery): Promise<DutyListPage> {
    const items = Array.from(this.duties.values()).slice(query.offset, query.offset + query.limit);
    const total = this.duties.size;

    return {
      items,
      total,
      limit: query.limit,
      offset: query.offset,
      nextOffset: query.offset + items.length < total ? query.offset + items.length : null
    };
  }

  public async createDuty(input: DutyInput): Promise<Duty> {
    const id = [FIRST_ID, SECOND_ID][this.nextIdIndex] ?? String(this.nextIdIndex + 3);
    this.nextIdIndex += 1;
    const duty = { id, name: input.name };
    this.duties.set(id, duty);
    return duty;
  }

  public async updateDuty(id: string, input: DutyInput): Promise<Duty> {
    if (!this.duties.has(id)) {
      throw new NotFoundError('Duty was not found.');
    }

    const duty = { id, name: input.name };
    this.duties.set(id, duty);
    return duty;
  }

  public async deleteDuty(id: string): Promise<void> {
    if (!this.duties.delete(id)) {
      throw new NotFoundError('Duty was not found.');
    }
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
