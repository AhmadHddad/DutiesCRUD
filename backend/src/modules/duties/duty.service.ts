import { NotFoundError } from '../../shared/errors';
import { Duty, DutyInput, DutyRepository, DutyServiceContract } from './duty.types';

export class DutyService implements DutyServiceContract {
  public constructor(private readonly repository: DutyRepository) {}

  public async listDuties(): Promise<Duty[]> {
    return this.repository.findAll();
  }

  public async createDuty(input: DutyInput): Promise<Duty> {
    return this.repository.create(input);
  }

  public async updateDuty(id: string, input: DutyInput): Promise<Duty> {
    const duty = await this.repository.update(id, input);

    if (duty === null) {
      throw new NotFoundError('Duty was not found.');
    }

    return duty;
  }

  public async deleteDuty(id: string): Promise<void> {
    const duty = await this.repository.delete(id);

    if (duty === null) {
      throw new NotFoundError('Duty was not found.');
    }
  }
}
