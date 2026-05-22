import { Router } from 'express';

import { DutyController } from './duty.controller';
import { DutyServiceContract } from './duty.types';

export function createDutyRouter(dutyService: DutyServiceContract): Router {
  const router = Router();
  const controller = new DutyController(dutyService);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
