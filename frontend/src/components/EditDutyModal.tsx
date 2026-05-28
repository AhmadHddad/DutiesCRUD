import type { Duty, DutyInput as DutyFormValues } from '@nexplore-duties/contracts';
import { Alert, Button, Form, Input, Modal, Spin } from 'antd';
import { useEffect } from 'react';

import { DUTY_NAME_MAX_LENGTH, getDutyNameError, normalizeDutyName } from './dutySchema';
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
  const [form] = Form.useForm<DutyFormValues>();

  useEffect(() => {
    if (!open || duty === null) {
      return;
    }

    form.setFields([
      {
        name: 'name',
        value: duty.name,
        errors: []
      }
    ]);
  }, [duty, form, open]);

  async function handleFinish(values: DutyFormValues): Promise<void> {
    await onSave(normalizeDutyName(values.name));
  }

  const isSaveDisabled = duty === null || isLoading || error !== null;

  return (
    <Modal
      confirmLoading={isSaving}
      destroyOnHidden
      okText={dutyLabels.editDutyModal.saveButton}
      okButtonProps={{ disabled: isSaveDisabled }}
      onCancel={onCancel}
      onOk={() => void form.submit()}
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
      <Form form={form} id="edit-duty-form" layout="vertical" onFinish={(values) => void handleFinish(values)}>
        {duty !== null ? (
          <Form.Item
            label={dutyLabels.editDutyModal.nameLabel}
            name="name"
            rules={[
              {
                validator: async (_, value: string | undefined) => {
                  const error = getDutyNameError(value ?? '');

                  if (error !== null) {
                    throw new Error(error);
                  }
                }
              }
            ]}
          >
            <Input aria-label={dutyLabels.editDutyModal.nameAriaLabel} maxLength={DUTY_NAME_MAX_LENGTH} />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}

export default EditDutyModal;
