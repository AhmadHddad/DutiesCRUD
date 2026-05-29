import type { Duty } from '@nexplore-duties/contracts';
import { Input, Typography } from 'antd';
import type { ChangeEvent } from 'react';

import { dutyLabels, formatLoadedCountLabel } from '../i18n/dutiesLabels';
import { DutiesTable } from './DutiesTable';

interface DutiesSectionProps {
  duties: Duty[];
  filterValue: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isMutating: boolean;
  loadedCount: number;
  onDelete(id: string): Promise<void>;
  onEdit(id: string): void;
  onFilterChange(value: string): void;
  onLoadMore(): Promise<void>;
  total: number;
}

export function DutiesSection({
  duties,
  filterValue,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isMutating,
  loadedCount,
  onDelete,
  onEdit,
  onFilterChange,
  onLoadMore,
  total
}: DutiesSectionProps) {
  function handleFilterChange(event: ChangeEvent<HTMLInputElement>): void {
    onFilterChange(event.target.value);
  }

  return (
    <section className="workspace-panel" aria-labelledby="duties-heading">
      <div className="section-heading section-heading--table">
        <Typography.Title id="duties-heading" level={2}>
          {dutyLabels.app.dutiesSectionTitle}
        </Typography.Title>
        <Typography.Text type="secondary">{formatLoadedCountLabel(loadedCount, total)}</Typography.Text>
      </div>
      <Input
        allowClear
        aria-label={dutyLabels.dutiesFilter.ariaLabel}
        className="duties-filter"
        onChange={handleFilterChange}
        placeholder={dutyLabels.dutiesFilter.placeholder}
        value={filterValue}
      />
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
