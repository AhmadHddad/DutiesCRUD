/// <reference types="jest" />

import express from 'express';
import request from 'supertest';

import { createCorsMiddleware } from './cors';

describe('createCorsMiddleware', () => {
  it('allows If-Match in preflight request headers', async () => {
    const app = createTestApp('http://localhost:5173');

    const response = await request(app)
      .options('/resource')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'if-match,content-type')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-headers']).toContain('If-Match');
  });

  it('exposes ETag to browser clients', async () => {
    const app = createTestApp('http://localhost:5173');

    const response = await request(app)
      .get('/resource')
      .set('Origin', 'http://localhost:5173')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-expose-headers']).toContain('ETag');
    expect(response.headers.etag).toBe('"duty-1-v1"');
  });
});

function createTestApp(allowedOrigin: string) {
  const app = express();

  app.use(createCorsMiddleware(allowedOrigin));
  app.get('/resource', (_req, res) => {
    res.setHeader('ETag', '"duty-1-v1"');
    res.status(200).json({ ok: true });
  });

  return app;
}
