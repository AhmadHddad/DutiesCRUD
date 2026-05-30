import type { Duty } from '@nexplore-duties/contracts';
import { Input, Typography } from 'antd';
import type { ChangeEvent } from 'react';

import { dutyLabels, formatLoadedCountLabel } from '../i18n/dutiesLabels';
import { DutiesTable } from './DutiesTable';

interface DutiesSectionProps {
  currentPage: number;
  duties: Duty[];
  filterValue: string;
  isLoading: boolean;
  isMutating: boolean;
  loadedCount: number;
  pageSize: number;
  onDelete(id: string): Promise<void>;
  onEdit(id: string): void;
  onFilterChange(value: string): void;
  onPageChange(page: number): void;
  total: number;
}

export function DutiesSection({
  currentPage,
  duties,
  filterValue,
  isLoading,
  isMutating,
  loadedCount,
  pageSize,
  onDelete,
  onEdit,
  onFilterChange,
  onPageChange,
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
        currentPage={currentPage}
        duties={duties}
        isLoading={isLoading}
        isMutating={isMutating}
        loadedCount={loadedCount}
        pageSize={pageSize}
        onDelete={onDelete}
        onEdit={onEdit}
        onPageChange={onPageChange}
        total={total}
      />
    </section>
  );
}
