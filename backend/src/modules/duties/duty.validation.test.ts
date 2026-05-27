import { ValidationError } from '../../errors/appErrors';
import {
  DUTY_LIST_DEFAULT_LIMIT,
  DUTY_LIST_MAX_LIMIT,
  DUTY_NAME_MAX_LENGTH,
  parseDutyId,
  parseDutyInput,
  parseDutyListQuery
} from './duty.validation';

describe('duty validation', () => {
  it('trims valid duty names', () => {
    expect(parseDutyInput({ name: '  Prepare sprint review  ' })).toEqual({
      name: 'Prepare sprint review'
    });
  });

  it('rejects missing duty names', () => {
    expect(() => parseDutyInput({})).toThrow(ValidationError);
  });

  it('rejects whitespace-only duty names', () => {
    expect(() => parseDutyInput({ name: '   ' })).toThrow('Duty name is required.');
  });

  it('rejects duty names longer than the maximum length', () => {
    expect(() => parseDutyInput({ name: 'a'.repeat(DUTY_NAME_MAX_LENGTH + 1) })).toThrow(
      `Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`
    );
  });

  it('sanitizes HTML from duty names', () => {
    expect(parseDutyInput({ name: '  <script>alert(1)</script>Check backups  ' })).toEqual({
      name: 'Check backups'
    });
  });

  it('rejects duty names that sanitize to empty', () => {
    expect(() => parseDutyInput({ name: '<script>alert(1)</script>' })).toThrow('Duty name is required.');
  });

  it('accepts UUID duty ids', () => {
    expect(parseDutyId('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('accepts non-uuid duty ids for backend lookup handling', () => {
    expect(parseDutyId('not-a-uuid')).toBe('not-a-uuid');
  });

  it('rejects missing duty ids', () => {
    expect(() => parseDutyId(undefined)).toThrow('Duty id is required.');
  });

  it('applies default pagination values', () => {
    expect(parseDutyListQuery({})).toEqual({
      limit: DUTY_LIST_DEFAULT_LIMIT,
      offset: 0
    });
  });

  it('parses explicit pagination values', () => {
    expect(parseDutyListQuery({ limit: '25', offset: '50' })).toEqual({
      limit: 25,
      offset: 50
    });
  });

  it('rejects invalid pagination values', () => {
    expect(() => parseDutyListQuery({ limit: String(DUTY_LIST_MAX_LIMIT + 1), offset: '-1' })).toThrow(
      `Too big: expected number to be <=${DUTY_LIST_MAX_LIMIT}`
    );
  });
});
