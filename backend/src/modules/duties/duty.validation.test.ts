import { ValidationError } from '../../shared/errors';
import { DUTY_NAME_MAX_LENGTH, parseDutyId, parseDutyInput } from './duty.validation';

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

  it('accepts UUID duty ids', () => {
    expect(parseDutyId('11111111-1111-4111-8111-111111111111')).toBe(
      '11111111-1111-4111-8111-111111111111'
    );
  });

  it('rejects invalid duty ids', () => {
    expect(() => parseDutyId('not-a-uuid')).toThrow('Duty id must be a valid UUID.');
  });
});
