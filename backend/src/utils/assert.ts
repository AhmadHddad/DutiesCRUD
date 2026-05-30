import { NotFoundError } from '../errors/appErrors';

export function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export function requireFound<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new NotFoundError(message);
  }

  return value;
}
