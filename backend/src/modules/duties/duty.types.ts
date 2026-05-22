export interface Duty {
  id: string;
  name: string;
}

export interface DutyInput {
  name: string;
}

export interface DutyRepository {
  findAll(): Promise<Duty[]>;
  create(input: DutyInput): Promise<Duty>;
  update(id: string, input: DutyInput): Promise<Duty | null>;
  delete(id: string): Promise<Duty | null>;
}

export interface DutyServiceContract {
  listDuties(): Promise<Duty[]>;
  createDuty(input: DutyInput): Promise<Duty>;
  updateDuty(id: string, input: DutyInput): Promise<Duty>;
  deleteDuty(id: string): Promise<void>;
}
