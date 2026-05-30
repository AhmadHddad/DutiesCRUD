import { PreconditionRequiredError, ValidationError } from '../../errors/appErrors';

// These ETags are used for optimistic concurrency, not generic HTTP body hashing.
// We encode `duty id + row version` so the server can validate `If-Match`
// directly against the database row and reject stale edits deterministically.
//
// This is intentionally manual instead of using a generic ETag library:
// - we need a stable, domain-specific token rather than a hash of serialized JSON
// - we must parse `If-Match` and verify it belongs to the same duty id
// - the format maps cleanly to `WHERE id = ? AND version = ?` in the repository
// - the logic is small enough that adding a dependency would add little value
const DUTY_ETAG_PATTERN = /^"duty-(\d+)-v(\d+)"$/;

export function createDutyEtag(id: string, version: string): string {
  return `"duty-${id}-v${version}"`;
}

export function parseDutyIfMatchHeader(headerValue: string | null, dutyId: string): string {
  if (!headerValue || headerValue.trim() === '') {
    throw new PreconditionRequiredError('If-Match header is required.');
  }

  const normalizedHeader = headerValue.trim();
  const match = DUTY_ETAG_PATTERN.exec(normalizedHeader);

  if (!match || match[1] !== dutyId) {
    throw new ValidationError('If-Match header must contain a valid duty ETag.');
  }

  // Return only the expected version because the repository performs the actual
  // concurrency check in SQL using the row's current version.
  return match[2] as string;
}
