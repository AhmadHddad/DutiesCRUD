import { DUTY_NAME_MAX_LENGTH } from '@nexplore-duties/contracts';

export { DUTY_NAME_MAX_LENGTH };

export function normalizeDutyName(value: string): string {
  return value.trim();
}

export function getDutyNameError(value: string): string | null {
  const normalized = normalizeDutyName(value);

  if (normalized.length === 0) {
    return 'Duty name is required.';
  }

  if (normalized.length > DUTY_NAME_MAX_LENGTH) {
    return `Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export function validateDutyName(value: string): true | string {
  return getDutyNameError(value) ?? true;
}

export function validateDutyNameRule(_: unknown, value: string | undefined): Promise<void> {
  const error = getDutyNameError(value ?? '');

  return error === null ? Promise.resolve() : Promise.reject(new Error(error));
}
