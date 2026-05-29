import { DUTY_NAME_MAX_LENGTH } from '@nexplore-duties/contracts';

import { ValidationError } from '../../errors/appErrors';
import { DutyInput, DutyListQuery } from './duty.types';

export const DUTY_LIST_DEFAULT_LIMIT = 50;
export const DUTY_LIST_MAX_LIMIT = 100;

export { DUTY_NAME_MAX_LENGTH };

/**
 * Validates a duty request body and returns the normalized input used by the service layer.
 * Example: `parseDutyInput({ name: '  Review PR  ' })` returns `{ name: 'Review PR' }`.
 */
export function parseDutyInput(body: unknown): DutyInput {
  if (!isRecord(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  return {
    name: parseDutyName(body.name)
  };
}

/**
 * Validates a route id and normalizes surrounding whitespace.
 * Example: `parseDutyId(' 42 ')` returns `'42'`.
 */
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

/**
 * Validates supported duty list query parameters and applies pagination defaults.
 * Example: `parseDutyListQuery({ limit: ['25', '50'], offset: '3' })` uses the first `limit` value and returns `{ limit: 25, offset: 3 }`.
 */
export function parseDutyListQuery(query: unknown): DutyListQuery {
  if (!isRecord(query)) {
    throw new ValidationError('Query parameters must be a JSON object.');
  }

  return {
    limit: parseIntegerQueryValue(query.limit, DUTY_LIST_DEFAULT_LIMIT, 1, DUTY_LIST_MAX_LIMIT, 'limit'),
    offset: parseIntegerQueryValue(query.offset, 0, 0, Number.MAX_SAFE_INTEGER, 'offset'),
    name: parseOptionalTextQueryValue(query.name, DUTY_NAME_MAX_LENGTH, 'name')
  };
}

/**
 * Ensures a parsed value is a plain object before property access.
 * Example: `isRecord({ name: 'Plan release' })` returns `true`, while `isRecord([])` returns `false`.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates and trims a duty name while preserving literal text such as `<script>` or `5 < 2`.
 * Example: `parseDutyName('  learn about <a>  ')` returns `'learn about <a>'`.
 */
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

/**
 * Parses one integer query value, applies defaults, and enforces inclusive min/max bounds.
 * Example: `parseIntegerQueryValue(['25', '50'], 50, 1, 100, 'limit')` uses the first value and returns `25`.
 */
function parseIntegerQueryValue(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
  fieldName: string
): number {
  const rawValue = getFirstQueryValue(value);
  if (rawValue === undefined) {
    return defaultValue;
  }

  const normalizedValue = rawValue.trim();
  const parsedValue = Number(normalizedValue);
  if (normalizedValue === '' || !Number.isInteger(parsedValue)) {
    throw new ValidationError(`${capitalize(fieldName)} must be an integer.`);
  }

  if (parsedValue < min) {
    throw new ValidationError(`${capitalize(fieldName)} must be at least ${min}.`);
  }

  if (parsedValue > max) {
    throw new ValidationError(`${capitalize(fieldName)} must be at most ${max}.`);
  }

  return parsedValue;
}

function parseOptionalTextQueryValue(value: unknown, maxLength: number, fieldName: string): string | undefined {
  const rawValue = getFirstQueryValue(value);
  if (rawValue === undefined) {
    return undefined;
  }

  const normalizedValue = rawValue.trim();
  if (normalizedValue === '') {
    return undefined;
  }

  if (normalizedValue.length > maxLength) {
    throw new ValidationError(`${capitalize(fieldName)} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

/**
 * Normalizes Express query values and lets repeated params fall back to the first item.
 * Example: `getFirstQueryValue(['1', '2'])` returns `'1'`.
 */
function getFirstQueryValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return getFirstQueryValue(value[0]);
  }

  if (typeof value !== 'string') {
    throw new ValidationError('Query parameter must be a string.');
  }

  return value;
}

/**
 * Uppercases the first character so validation messages can use field names like `Limit` and `Offset`.
 * Example: `capitalize('offset')` returns `'Offset'`.
 */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
