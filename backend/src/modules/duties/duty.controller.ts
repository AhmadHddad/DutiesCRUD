import { Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { createDutyEtag, parseDutyIfMatchHeader } from './duty.etag';
import { parseDutyId, parseDutyInput, parseDutyListQuery } from './duty.validation';
import { DutyServiceContract } from './duty.types';

export class DutyController {
  public constructor(private readonly dutyService: DutyServiceContract) {}

  public list = asyncHandler(async (req, res: Response) => {
    const query = parseDutyListQuery(req.query);
    const duties = await this.dutyService.listDuties(query);
    res.status(200).json({ data: duties });
  });

  public create = asyncHandler(async (req, res: Response) => {
    const input = parseDutyInput(req.body);
    const duty = await this.dutyService.createDuty(input);
    res.status(201).json({ data: duty });
  });

  public getById = asyncHandler(async (req, res: Response) => {
    const id = parseDutyId(req.params.id);
    const duty = await this.dutyService.getDuty(id);
    res.setHeader('ETag', createDutyEtag(duty.id, duty.version));
    res.status(200).json({
      data: {
        id: duty.id,
        name: duty.name
      }
    });
  });

  public update = asyncHandler(async (req, res: Response) => {
    const id = parseDutyId(req.params.id);
    const input = parseDutyInput(req.body);
    const expectedVersion = parseDutyIfMatchHeader(req.header('if-match'), id);
    const duty = await this.dutyService.updateDuty(id, input, expectedVersion);
    res.setHeader('ETag', createDutyEtag(duty.id, duty.version));
    res.status(200).json({
      data: {
        id: duty.id,
        name: duty.name
      }
    });
  });

  public delete = asyncHandler(async (req, res: Response) => {
    const id = parseDutyId(req.params.id);
    await this.dutyService.deleteDuty(id);
    res.status(204).send();
  });
}
