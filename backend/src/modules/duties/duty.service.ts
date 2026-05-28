import { NotFoundError, PreconditionFailedError } from '../../errors/appErrors';
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
    const duty = await this.repository.findById(id);

    if (duty === null) {
      throw new NotFoundError('Duty was not found.');
    }

    return duty;
  }

  public async updateDuty(id: string, input: DutyInput, expectedVersion: string): Promise<DutyRecord> {
    const result = await this.repository.update(id, input, expectedVersion);

    if (result.duty !== null) {
      return result.duty;
    }

    if (result.conflictDuty === null) {
      throw new NotFoundError('Duty was not found.');
    }

    throw new PreconditionFailedError('Duty has changed since you opened it. The latest duty has been loaded.', {
      details: {
        latestDuty: {
          id: result.conflictDuty.id,
          name: result.conflictDuty.name
        }
      },
      headers: {
        ETag: createDutyEtag(result.conflictDuty.id, result.conflictDuty.version)
      }
    });
  }

  public async deleteDuty(id: string): Promise<void> {
    const duty = await this.repository.delete(id);

    if (duty === null) {
      throw new NotFoundError('Duty was not found.');
    }
  }
}
