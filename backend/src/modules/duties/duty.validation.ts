import { ValidationError } from '../../shared/errors';
import { DutyInput } from './duty.types';

export const DUTY_NAME_MAX_LENGTH = 120;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDutyInput(body: unknown): DutyInput {
  if (!isRecord(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const rawName = body.name;

  if (typeof rawName !== 'string') {
    throw new ValidationError('Duty name is required.');
  }

  const name = rawName.trim();

  if (name.length === 0) {
    throw new ValidationError('Duty name is required.');
  }

  if (name.length > DUTY_NAME_MAX_LENGTH) {
    throw new ValidationError(`Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`);
  }

  return { name };
}

export function parseDutyId(id: string | undefined): string {
  if (id === undefined || !UUID_PATTERN.test(id)) {
    throw new ValidationError('Duty id must be a valid UUID.');
  }

  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
