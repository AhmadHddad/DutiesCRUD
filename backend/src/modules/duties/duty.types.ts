import type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';

export type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';

export interface DutyRecord extends Duty {
  version: string;
}

export interface DutyUpdateResult {
  duty: DutyRecord | null;
  conflictDuty: DutyRecord | null;
}

export interface DutyRepository {
  findAll(query: DutyListQuery): Promise<DutyListPage>;
  create(input: DutyInput): Promise<Duty>;
  findById(id: string): Promise<DutyRecord | null>;
  update(id: string, input: DutyInput, expectedVersion: string): Promise<DutyUpdateResult>;
  delete(id: string): Promise<Duty | null>;
}

export interface DutyServiceContract {
  listDuties(query: DutyListQuery): Promise<DutyListPage>;
  createDuty(input: DutyInput): Promise<Duty>;
  getDuty(id: string): Promise<DutyRecord>;
  updateDuty(id: string, input: DutyInput, expectedVersion: string): Promise<DutyRecord>;
  deleteDuty(id: string): Promise<void>;
}
