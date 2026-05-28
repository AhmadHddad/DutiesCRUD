import { zodResolver } from '@hookform/resolvers/zod';
import type { Duty, DutyInput as DutyFormValues } from '@nexplore-duties/contracts';
import { Alert, Button, Form, Input, Modal, Spin } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { DUTY_NAME_MAX_LENGTH, dutyFormSchema } from './dutySchema';
import { dutyLabels } from '../i18n/dutiesLabels';

interface EditDutyModalProps {
  duty: Duty | null;
  conflictMessage: string | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  open: boolean;
  onCancel(): void;
  onRefresh(): void;
  onSave(name: string): Promise<boolean>;
}

function EditDutyModal({
  duty,
  conflictMessage,
  error,
  isLoading,
  isRefreshing,
  isSaving,
  open,
  onCancel,
  onRefresh,
  onSave
}: EditDutyModalProps) {
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

  const isSaveDisabled = duty === null || isLoading || error !== null;

  return (
    <Modal
      confirmLoading={isSaving}
      destroyOnHidden
      okText={dutyLabels.editDutyModal.saveButton}
      okButtonProps={{ disabled: isSaveDisabled }}
      onCancel={onCancel}
      onOk={() => void handleSubmit(handleFinish)()}
      open={open}
      title={dutyLabels.editDutyModal.title}
    >
      {conflictMessage !== null ? (
        <Alert
          action={
            <Button loading={isRefreshing} onClick={onRefresh} size="small">
              {dutyLabels.editDutyModal.refreshButton}
            </Button>
          }
          className="edit-duty-modal__alert"
          message={conflictMessage}
          showIcon
          type="warning"
        />
      ) : null}
      {error !== null ? <Alert className="edit-duty-modal__alert" message={error} showIcon type="error" /> : null}
      {isLoading ? (
        <div aria-live="polite">
          <Spin size="large" />
          <div>{dutyLabels.editDutyModal.loading}</div>
        </div>
      ) : null}
      {duty !== null ? (
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
      ) : null}
    </Modal>
  );
}

export default EditDutyModal;
