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

  it('preserves literal angle brackets in duty names', () => {
    expect(parseDutyInput({ name: '  learn about <a> and 5 < 2 and 3>2  ' })).toEqual({
      name: 'learn about <a> and 5 < 2 and 3>2'
    });
  });

  it('accepts text that looks like HTML as plain text', () => {
    expect(parseDutyInput({ name: '<script>alert(1)</script>' })).toEqual({
      name: '<script>alert(1)</script>'
    });
  });

  it('accepts positive integer duty ids', () => {
    expect(parseDutyId('123')).toBe('123');
  });

  it('trims duty ids before validation', () => {
    expect(parseDutyId(' 42 ')).toBe('42');
  });

  it('rejects missing duty ids', () => {
    expect(() => parseDutyId(undefined)).toThrow('Duty id is required.');
  });

  it('rejects non-numeric duty ids', () => {
    expect(() => parseDutyId('not-a-number')).toThrow('Duty id must be a positive integer.');
  });

  it('rejects non-positive duty ids', () => {
    expect(() => parseDutyId('0')).toThrow('Duty id must be a positive integer.');
    expect(() => parseDutyId('-1')).toThrow('Duty id must be a positive integer.');
  });

  it('rejects decimal duty ids', () => {
    expect(() => parseDutyId('1.5')).toThrow('Duty id must be a positive integer.');
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
