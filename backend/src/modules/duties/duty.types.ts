import type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';

export type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';

export interface DutyRepository {
  findAll(query: DutyListQuery): Promise<DutyListPage>;
  create(input: DutyInput): Promise<Duty>;
  update(id: string, input: DutyInput): Promise<Duty | null>;
  delete(id: string): Promise<Duty | null>;
}

export interface DutyServiceContract {
  listDuties(query: DutyListQuery): Promise<DutyListPage>;
  createDuty(input: DutyInput): Promise<Duty>;
  updateDuty(id: string, input: DutyInput): Promise<Duty>;
  deleteDuty(id: string): Promise<void>;
}
