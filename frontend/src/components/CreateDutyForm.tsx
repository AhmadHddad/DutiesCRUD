import { PlusOutlined } from '@ant-design/icons';
import type { DutyInput as DutyFormValues } from '@nexplore-duties/contracts';
import { Button, Form, Input } from 'antd';

import { dutyLabels } from '../i18n/dutiesLabels';
import { DUTY_NAME_MAX_LENGTH, normalizeDutyName, validateDutyNameRule } from './dutySchema';

interface CreateDutyFormProps {
  isSubmitting: boolean;
  onCreate(name: string): Promise<void>;
}

export function CreateDutyForm({ isSubmitting, onCreate }: CreateDutyFormProps) {
  const [form] = Form.useForm<DutyFormValues>();

  async function handleFinish(values: DutyFormValues): Promise<void> {
    await onCreate(normalizeDutyName(values.name));
    form.resetFields();
  }

  return (
    <Form
      className="create-duty-form"
      form={form}
      initialValues={{ name: '' }}
      onFinish={(values) => void handleFinish(values)}
    >
      <Form.Item
        className="create-duty-form__input"
        name="name"
        rules={[{ validator: validateDutyNameRule }]}
      >
        <Input
          aria-label={dutyLabels.createDutyForm.nameAriaLabel}
          maxLength={DUTY_NAME_MAX_LENGTH}
          placeholder={dutyLabels.createDutyForm.namePlaceholder}
        />
      </Form.Item>
      <Form.Item className="create-duty-form__button">
        <Button htmlType="submit" icon={<PlusOutlined />} loading={isSubmitting} type="primary">
          {dutyLabels.createDutyForm.submitButton}
        </Button>
      </Form.Item>
    </Form>
  );
}
