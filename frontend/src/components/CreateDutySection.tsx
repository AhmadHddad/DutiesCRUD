import { Typography } from 'antd';

import { dutyLabels } from '../i18n/dutiesLabels';
import { CreateDutyForm } from './CreateDutyForm';

interface CreateDutySectionProps {
  isSubmitting: boolean;
  onCreate(name: string): Promise<void>;
}

export function CreateDutySection({ isSubmitting, onCreate }: CreateDutySectionProps) {
  return (
    <section className="workspace-panel" aria-labelledby="create-duty-heading">
      <div className="section-heading">
        <Typography.Title id="create-duty-heading" level={2}>
          {dutyLabels.app.createSectionTitle}
        </Typography.Title>
      </div>
      <CreateDutyForm isSubmitting={isSubmitting} onCreate={onCreate} />
    </section>
  );
}
