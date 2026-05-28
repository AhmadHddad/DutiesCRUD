import { DUTY_NAME_MAX_LENGTH } from '@nexplore-duties/contracts';

import { ValidationError } from '../../errors/appErrors';
import { DutyInput, DutyListQuery } from './duty.types';

export const DUTY_LIST_DEFAULT_LIMIT = 50;
export const DUTY_LIST_MAX_LIMIT = 100;

export { DUTY_NAME_MAX_LENGTH };

export function parseDutyInput(body: unknown): DutyInput {
  if (!isRecord(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  return {
    name: parseDutyName(body.name)
  };
}

export function parseDutyId(id: string | undefined): string {
  if (id === undefined || id.trim() === '') {
    throw new ValidationError('Duty id is required.');
  }

  const normalized = id.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new ValidationError('Duty id must be a positive integer.');
  }

  return normalized;
}

export function parseDutyListQuery(query: unknown): DutyListQuery {
  if (!isRecord(query)) {
    throw new ValidationError('Query parameters must be a JSON object.');
  }

  return {
    limit: parseIntegerQueryValue(query.limit, DUTY_LIST_DEFAULT_LIMIT, 1, DUTY_LIST_MAX_LIMIT, 'limit'),
    offset: parseIntegerQueryValue(query.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset')
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDutyName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('Duty name is required.');
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError('Duty name is required.');
  }

  if (normalized.length > DUTY_NAME_MAX_LENGTH) {
    throw new ValidationError(`Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`);
  }

  return normalized;
}

function parseIntegerQueryValue(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const rawValue = getSingleQueryValue(value, fieldName);
  if (!/^-?\d+$/.test(rawValue)) {
    throw new ValidationError(`${capitalize(fieldName)} must be an integer.`);
  }

  const parsedValue = Number(rawValue);
  if (parsedValue < min) {
    throw new ValidationError(`${capitalize(fieldName)} must be at least ${min}.`);
  }

  if (parsedValue > max) {
    throw new ValidationError(`${capitalize(fieldName)} must be at most ${max}.`);
  }

  return parsedValue;
}

function getSingleQueryValue(value: unknown, fieldName: string): string {
  if (Array.isArray(value)) {
    throw new ValidationError(`${capitalize(fieldName)} must be provided once.`);
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${capitalize(fieldName)} must be a string.`);
  }

  return value.trim();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
