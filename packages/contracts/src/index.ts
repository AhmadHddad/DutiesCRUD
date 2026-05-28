export interface Duty {
  id: string;
  name: string;
}

export interface DutyInput {
  name: string;
}

export interface DutyListQuery {
  limit: number;
  offset: number;
}

export interface DutyListPage {
  items: Duty[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
}

export const DUTY_NAME_MAX_LENGTH = 256;
