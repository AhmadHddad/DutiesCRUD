import { Rule } from 'antd/es/form';

export const DUTY_NAME_MAX_LENGTH = 120;

export const dutyNameRules: Rule[] = [
  {
    required: true,
    whitespace: true,
    message: 'Duty name is required.'
  },
  {
    max: DUTY_NAME_MAX_LENGTH,
    message: `Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`
  }
];

export interface DutyFormValues {
  name: string;
}
