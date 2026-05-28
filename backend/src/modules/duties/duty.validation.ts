import { DUTY_NAME_MAX_LENGTH } from '@nexplore-duties/contracts';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

import { ValidationError } from '../../errors/appErrors';
import { DutyInput, DutyListQuery } from './duty.types';

export const DUTY_LIST_DEFAULT_LIMIT = 50;
export const DUTY_LIST_MAX_LIMIT = 100;

export { DUTY_NAME_MAX_LENGTH };

const dutyNameSchema = z
  .string()
  .trim()
  .min(1, 'Duty name is required.')
  .max(DUTY_NAME_MAX_LENGTH, `Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`);

const dutyListQuerySchema: z.ZodType<DutyListQuery> = z.object({
  limit: z.coerce.number().int().min(1).max(DUTY_LIST_MAX_LIMIT).default(DUTY_LIST_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0)
});

export const dutyInputSchema = z.object({
  name: z.string().transform((value) => sanitizeDutyName(value)).pipe(dutyNameSchema)
});

export function parseDutyInput(body: unknown): DutyInput {
  if (!isRecord(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  if (typeof body.name !== 'string') {
    throw new ValidationError('Duty name is required.');
  }

  return parseWithValidation<DutyInput>(dutyInputSchema as z.ZodType<DutyInput>, body);
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

  return parseWithValidation<DutyListQuery>(dutyListQuerySchema as z.ZodType<DutyListQuery>, query);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeDutyName(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();
}

function parseWithValidation<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid request.');
  }

  return result.data;
}
