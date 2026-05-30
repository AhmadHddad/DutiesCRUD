import { describe, expect, it } from '@jest/globals';
import request from 'supertest';

import { createApp } from '../app';

const healthCheckOk = async (): Promise<void> => {};

describe('swagger docs', () => {
  it('serves the checked-in openapi spec as json', async () => {
    const app = createApp({
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/openapi.json').expect(200);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toMatchObject({
      openapi: '3.0.3',
      info: {
        title: 'Nexplore Duties API',
        version: '1.0.0'
      }
    });
    expect(response.body.paths['/api/duties']).toBeDefined();
    expect(response.body.paths['/api/duties'].get.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ $ref: '#/components/parameters/DutyNameFilter' })])
    );
  });

  it('serves swagger ui html', async () => {
    const app = createApp({
      healthCheck: healthCheckOk
    });

    const response = await request(app).get('/docs').expect(301);

    expect(response.headers.location).toBe('/docs/');

    const htmlResponse = await request(app).get('/docs/').expect(200);

    expect(htmlResponse.headers['content-type']).toMatch(/text\/html/);
    expect(htmlResponse.text).toContain('Swagger UI');
    expect(htmlResponse.text).toContain('swagger-ui-init.js');
  });
});
