import type { Duty } from '@nexplore-duties/contracts';
import { Typography } from 'antd';

import { dutyLabels, formatLoadedCountLabel } from '../i18n/dutiesLabels';
import { DutiesTable } from './DutiesTable';

interface DutiesSectionProps {
  duties: Duty[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isMutating: boolean;
  loadedCount: number;
  onDelete(id: string): Promise<void>;
  onEdit(id: string): void;
  onLoadMore(): Promise<void>;
  total: number;
}

export function DutiesSection({
  duties,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isMutating,
  loadedCount,
  onDelete,
  onEdit,
  onLoadMore,
  total
}: DutiesSectionProps) {
  return (
    <section className="workspace-panel" aria-labelledby="duties-heading">
      <div className="section-heading section-heading--table">
        <Typography.Title id="duties-heading" level={2}>
          {dutyLabels.app.dutiesSectionTitle}
        </Typography.Title>
        <Typography.Text type="secondary">{formatLoadedCountLabel(loadedCount, total)}</Typography.Text>
      </div>
      <DutiesTable
        duties={duties}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        isMutating={isMutating}
        loadedCount={loadedCount}
        onDelete={onDelete}
        onEdit={onEdit}
        onLoadMore={onLoadMore}
        total={total}
      />
    </section>
  );
}
