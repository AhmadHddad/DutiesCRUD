import { PreconditionRequiredError, ValidationError } from '../../errors/appErrors';

const DUTY_ETAG_PATTERN = /^"duty-(\d+)-v(\d+)"$/;

export function createDutyEtag(id: string, version: string): string {
  return `"duty-${id}-v${version}"`;
}

export function parseDutyIfMatchHeader(headerValue: string | undefined, dutyId: string): string {
  if (headerValue === undefined || headerValue.trim() === '') {
    throw new PreconditionRequiredError('If-Match header is required.');
  }

  const normalizedHeader = headerValue.trim();
  const match = DUTY_ETAG_PATTERN.exec(normalizedHeader);

  if (match === null || match[1] !== dutyId) {
    throw new ValidationError('If-Match header must contain a valid duty ETag.');
  }

  return match[2] as string;
}
