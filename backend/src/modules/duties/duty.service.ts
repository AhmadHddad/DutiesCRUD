import { PreconditionFailedError } from '../../errors/appErrors';
import { requireFound } from '../../utils/assert';
import { createDutyEtag } from './duty.etag';
import { Duty, DutyInput, DutyListPage, DutyListQuery, DutyRecord, DutyRepository, DutyServiceContract } from './duty.types';

export class DutyService implements DutyServiceContract {
  public constructor(private readonly repository: DutyRepository) {}

  public async listDuties(query: DutyListQuery): Promise<DutyListPage> {
    return this.repository.findAll(query);
  }

  public async createDuty(input: DutyInput): Promise<Duty> {
    return this.repository.create(input);
  }

  public async getDuty(id: string): Promise<DutyRecord> {
    return requireFound(await this.repository.findById(id), 'Duty was not found.');
  }

  public async updateDuty(id: string, input: DutyInput, expectedVersion: string): Promise<DutyRecord> {
    const result = await this.repository.update(id, input, expectedVersion);

    if (result.duty !== null) {
      return result.duty;
    }

    const conflictDuty = requireFound(result.conflictDuty, 'Duty was not found.');

    throw new PreconditionFailedError('Duty has changed since you opened it. The latest duty has been loaded.', {
      details: {
        latestDuty: {
          id: conflictDuty.id,
          name: conflictDuty.name
        }
      },
      headers: {
        ETag: createDutyEtag(conflictDuty.id, conflictDuty.version)
      }
    });
  }

  public async deleteDuty(id: string): Promise<void> {
    requireFound(await this.repository.delete(id), 'Duty was not found.');
  }
}
