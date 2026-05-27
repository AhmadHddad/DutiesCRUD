import { zodResolver } from '@hookform/resolvers/zod';
import type { Duty, DutyInput as DutyFormValues } from '@nexplore-duties/contracts';
import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { DUTY_NAME_MAX_LENGTH, dutyFormSchema } from './dutySchema';
import { dutyLabels } from '../i18n/dutiesLabels';

interface EditDutyModalProps {
  duty: Duty | null;
  isSaving: boolean;
  open: boolean;
  onCancel(): void;
  onSave(name: string): Promise<void>;
}

function EditDutyModal({ duty, isSaving, open, onCancel, onSave }: EditDutyModalProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<DutyFormValues>({
    resolver: zodResolver(dutyFormSchema),
    defaultValues: {
      name: duty?.name ?? ''
    }
  });

  useEffect(() => {
    reset({
      name: open && duty !== null ? duty.name : ''
    });
  }, [duty, open, reset]);

  async function handleFinish(values: DutyFormValues): Promise<void> {
    await onSave(values.name);
  }

  return (
    <Modal
      confirmLoading={isSaving}
      destroyOnHidden
      okText={dutyLabels.editDutyModal.saveButton}
      onCancel={onCancel}
      onOk={() => void handleSubmit(handleFinish)()}
      open={open}
      title={dutyLabels.editDutyModal.title}
    >
      <form id="edit-duty-form" onSubmit={handleSubmit(handleFinish)}>
        <Form.Item
          help={errors.name?.message}
          label={dutyLabels.editDutyModal.nameLabel}
          validateStatus={errors.name ? 'error' : undefined}
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input {...field} aria-label={dutyLabels.editDutyModal.nameAriaLabel} maxLength={DUTY_NAME_MAX_LENGTH} />
            )}
          />
        </Form.Item>
      </form>
    </Modal>
  );
}

export default EditDutyModal;
