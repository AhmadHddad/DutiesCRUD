import express from 'express';

import { loadConfig } from './config/env';
import { getPool } from './database/pool';
import { ServiceUnavailableError } from './errors/appErrors';
import { createCorsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestIdMiddleware, requestLogger } from './middleware/requestId';
import { createApiRateLimiter, createDutyWriteRateLimiter, createSecurityMiddleware } from './middleware/security';
import { PgDutyRepository } from './modules/duties/duty.repository';
import { createDutyRouter } from './modules/duties/duty.routes';
import { DutyService } from './modules/duties/duty.service';
import { DutyServiceContract } from './modules/duties/duty.types';

export interface AppDependencies {
  dutyService?: DutyServiceContract;
  healthCheck?: () => Promise<void>;
}

export function createApp(dependencies: AppDependencies = {}) {
  const config = loadConfig();
  const app = express();
  const dutyService = dependencies.dutyService ?? new DutyService(new PgDutyRepository(getPool(config)));
  const healthCheck = dependencies.healthCheck ?? defaultHealthCheck;
  const dutyWriteRateLimiter = createDutyWriteRateLimiter(config);

  // Middleware order is intentional so request IDs and access logs are available
  // before security, CORS, parsing, and route-level error handling run.
  app.use(requestIdMiddleware);
  app.use(requestLogger);
  app.use(createSecurityMiddleware());
  app.use(createCorsMiddleware(config.corsOrigin));

  // Keep JSON bodies small enough for this API's simple payloads and to reduce
  // abuse risk from oversized requests.
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', createApiRateLimiter(config));

  app.get('/health', async (_req, res, next) => {
    try {
      await healthCheck();
      res.status(200).json({
        status: 'ok',
        database: 'ok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(new ServiceUnavailableError(error instanceof Error ? error.message : 'Database is unavailable.'));
    }
  });

  app.use('/api/duties', createDutyRouter(dutyService, dutyWriteRateLimiter));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function defaultHealthCheck(): Promise<void> {
  await getPool().query('SELECT 1');
}
