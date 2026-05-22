import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

import { Duty } from '../types/duty';
import { DutyFormValues, dutyNameRules } from './dutyValidation';

interface EditDutyModalProps {
  duty: Duty | null;
  isSaving: boolean;
  open: boolean;
  onCancel(): void;
  onSave(name: string): Promise<void>;
}

export function EditDutyModal({ duty, isSaving, open, onCancel, onSave }: EditDutyModalProps) {
  const [form] = Form.useForm<DutyFormValues>();

  useEffect(() => {
    if (open && duty !== null) {
      form.setFieldsValue({ name: duty.name });
      return;
    }

    form.resetFields();
  }, [duty, form, open]);

  async function handleFinish(values: DutyFormValues): Promise<void> {
    await onSave(values.name.trim());
  }

  return (
    <Modal
      confirmLoading={isSaving}
      destroyOnHidden
      okText="Save changes"
      onCancel={onCancel}
      onOk={() => form.submit()}
      open={open}
      title="Edit duty"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item label="Duty name" name="name" rules={dutyNameRules}>
          <Input aria-label="Duty name" maxLength={120} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
