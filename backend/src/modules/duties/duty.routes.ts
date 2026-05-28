import { RequestHandler, Router } from 'express';

import { DutyController } from './duty.controller';
import { DutyServiceContract } from './duty.types';

export function createDutyRouter(dutyService: DutyServiceContract, writeRateLimiter?: RequestHandler): Router {
  const router = Router();
  const controller = new DutyController(dutyService);
  const mutationMiddleware = writeRateLimiter ?? ((_req, _res, next) => next());

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', mutationMiddleware, controller.create);
  router.put('/:id', mutationMiddleware, controller.update);
  router.delete('/:id', mutationMiddleware, controller.delete);

  return router;
}
