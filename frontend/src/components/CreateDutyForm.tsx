import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';

import { DutyFormValues, dutyNameRules } from './dutyValidation';

interface CreateDutyFormProps {
  isSubmitting: boolean;
  onCreate(name: string): Promise<void>;
}

export function CreateDutyForm({ isSubmitting, onCreate }: CreateDutyFormProps) {
  const [form] = Form.useForm<DutyFormValues>();

  async function handleFinish(values: DutyFormValues): Promise<void> {
    try {
      await onCreate(values.name.trim());
      form.resetFields();
    } catch {
      form.setFieldsValue({ name: values.name });
    }
  }

  return (
    <Form form={form} className="create-duty-form" layout="inline" onFinish={handleFinish}>
      <Form.Item className="create-duty-form__input" name="name" rules={dutyNameRules}>
        <Input aria-label="New duty name" maxLength={120} placeholder="Add a duty" />
      </Form.Item>
      <Form.Item className="create-duty-form__button">
        <Button htmlType="submit" icon={<PlusOutlined />} loading={isSubmitting} type="primary">
          Add duty
        </Button>
      </Form.Item>
    </Form>
  );
}
