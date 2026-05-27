import { z } from 'zod';

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

const dutyNameSchema = z
  .string()
  .trim()
  .min(1, 'Duty name is required.')
  .max(DUTY_NAME_MAX_LENGTH, `Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`);

export const dutyInputSchema = z.object({
  name: dutyNameSchema
});
