import request from 'supertest';

import { createApp } from '../../app';
import { NotFoundError } from '../../shared/errors';
import { Duty, DutyInput, DutyServiceContract } from './duty.types';

const FIRST_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_ID = '22222222-2222-4222-8222-222222222222';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

describe('duty routes', () => {
  it('returns the duty list', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Plan release' }]),
      healthCheck: async () => undefined
    });

    const response = await request(app).get('/api/duties').expect(200);

    expect(response.body).toEqual({
      data: [{ id: FIRST_ID, name: 'Plan release' }]
    });
  });

  it('creates duties with validated input', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService(),
      healthCheck: async () => undefined
    });

    const response = await request(app)
      .post('/api/duties')
      .send({ name: '  Check backups  ' })
      .expect(201);

    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: 'Check backups' }
    });
  });

  it('updates an existing duty', async () => {
    const app = createApp({
      dutyService: new InMemoryDutyService([{ id: FIRST_ID, name: 'Old name' }]),
      healthCheck: async () => undefined
    });

    const response = await request(app)
      .put(`/api/duties/${FIRST_ID}`)
      .send({ name: 'New name' })
      .expect(200);

    expect(response.body).toEqual({
      data: { id: FIRST_ID, name: 'New name' }
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
});

class InMemoryDutyService implements DutyServiceContract {
  private readonly duties = new Map<string, Duty>();
  private nextIdIndex = 0;

  public constructor(seed: Duty[] = []) {
    for (const duty of seed) {
      this.duties.set(duty.id, duty);
    }
  }

  public async listDuties(): Promise<Duty[]> {
    return Array.from(this.duties.values());
  }

  public async createDuty(input: DutyInput): Promise<Duty> {
    const id = [FIRST_ID, SECOND_ID][this.nextIdIndex] ?? `33333333-3333-4333-8333-${this.nextIdIndex}`;
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
