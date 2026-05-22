import express from 'express';

import { loadConfig } from './config/env';
import { getPool } from './database/pool';
import { PgDutyRepository } from './modules/duties/duty.repository';
import { createDutyRouter } from './modules/duties/duty.routes';
import { DutyService } from './modules/duties/duty.service';
import { DutyServiceContract } from './modules/duties/duty.types';
import { createCorsMiddleware } from './shared/cors';
import { errorHandler, notFoundHandler, ServiceUnavailableError } from './shared/errors';
import { requestIdMiddleware, requestLogger } from './shared/requestId';

export interface AppDependencies {
  dutyService?: DutyServiceContract;
  healthCheck?: () => Promise<void>;
}

export function createApp(dependencies: AppDependencies = {}) {
  const config = loadConfig();
  const app = express();
  const dutyService = dependencies.dutyService ?? new DutyService(new PgDutyRepository(getPool(config)));
  const healthCheck = dependencies.healthCheck ?? defaultHealthCheck;

  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(requestLogger);
  app.use(createCorsMiddleware(config.corsOrigin));
  app.use(express.json({ limit: '64kb' }));

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

  app.use('/api/duties', createDutyRouter(dutyService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function defaultHealthCheck(): Promise<void> {
  await getPool().query('SELECT 1');
}
