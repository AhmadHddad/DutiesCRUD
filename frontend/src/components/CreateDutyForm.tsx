import { zodResolver } from '@hookform/resolvers/zod';
import { PlusOutlined } from '@ant-design/icons';
import type { DutyInput as DutyFormValues } from '@nexplore-duties/contracts';
import { Button, Form, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { DUTY_NAME_MAX_LENGTH, dutyFormSchema } from './dutySchema';

interface CreateDutyFormProps {
  isSubmitting: boolean;
  onCreate(name: string): Promise<void>;
}

export function CreateDutyForm({ isSubmitting, onCreate }: CreateDutyFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset
  } = useForm<DutyFormValues>({
    resolver: zodResolver(dutyFormSchema),
    defaultValues: {
      name: ''
    }
  });

  async function handleFinish(values: DutyFormValues): Promise<void> {
    await onCreate(values.name);
    reset();
  }

  return (
    <form className="create-duty-form" onSubmit={handleSubmit(handleFinish)}>
      <Form.Item
        className="create-duty-form__input"
        help={errors.name?.message}
        validateStatus={errors.name ? 'error' : undefined}
      >
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              {...field}
              aria-label="New duty name"
              maxLength={DUTY_NAME_MAX_LENGTH}
              placeholder="Add a duty"
            />
          )}
        />
      </Form.Item>
      <Form.Item className="create-duty-form__button">
        <Button htmlType="submit" icon={<PlusOutlined />} loading={isSubmitting} type="primary">
          Add duty
        </Button>
      </Form.Item>
    </form>
  );
}
