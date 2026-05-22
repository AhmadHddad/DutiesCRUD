import { Response } from 'express';

import { asyncHandler } from '../../shared/asyncHandler';
import { parseDutyId, parseDutyInput } from './duty.validation';
import { DutyServiceContract } from './duty.types';

export class DutyController {
  public constructor(private readonly dutyService: DutyServiceContract) {}

  public list = asyncHandler(async (_req, res: Response) => {
    const duties = await this.dutyService.listDuties();
    res.status(200).json({ data: duties });
  });

  public create = asyncHandler(async (req, res: Response) => {
    const input = parseDutyInput(req.body);
    const duty = await this.dutyService.createDuty(input);
    res.status(201).json({ data: duty });
  });

  public update = asyncHandler(async (req, res: Response) => {
    const id = parseDutyId(req.params.id);
    const input = parseDutyInput(req.body);
    const duty = await this.dutyService.updateDuty(id, input);
    res.status(200).json({ data: duty });
  });

  public delete = asyncHandler(async (req, res: Response) => {
    const id = parseDutyId(req.params.id);
    await this.dutyService.deleteDuty(id);
    res.status(204).send();
  });
}
