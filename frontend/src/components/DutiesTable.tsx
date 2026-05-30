import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Empty, Popconfirm, Space, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import type { Duty } from '@nexplore-duties/contracts';

import {
  dutyLabels,
  formatDeleteDutyAriaLabel,
  formatEditDutyAriaLabel,
  formatLoadedCountLabel
} from '../i18n/dutiesLabels';

interface DutiesTableProps {
  currentPage: number;
  duties: Duty[];
  isLoading: boolean;
  isMutating: boolean;
  loadedCount: number;
  pageSize: number;
  total: number;
  onDelete(id: string): Promise<void>;
  onEdit(id: string): void;
  onPageChange(page: number): void;
}

export function DutiesTable({
  currentPage,
  duties,
  isLoading,
  isMutating,
  loadedCount,
  pageSize,
  total,
  onDelete,
  onEdit,
  onPageChange
}: DutiesTableProps) {
  const columns = useMemo<ColumnsType<Duty>>(
    () => [
      {
        title: dutyLabels.dutiesTable.columns.name,
        dataIndex: 'name',
        key: 'name',
        render: (name: string) => <Typography.Text>{name}</Typography.Text>
      },
      {
        title: dutyLabels.dutiesTable.columns.actions,
        key: 'actions',
        align: 'right',
        width: 130,
        render: (_value, duty) => (
          <Space size="small">
            <Tooltip title={dutyLabels.dutiesTable.editTooltip}>
              <Button
                aria-label={formatEditDutyAriaLabel(duty.name)}
                icon={<EditOutlined />}
                onClick={() => onEdit(duty.id)}
                type="text"
              />
            </Tooltip>
            <Popconfirm
              cancelText={dutyLabels.dutiesTable.deleteConfirmCancel}
              okButtonProps={{ danger: true, loading: isMutating }}
              okText={dutyLabels.dutiesTable.deleteConfirmOk}
              onConfirm={() => onDelete(duty.id)}
              title={dutyLabels.dutiesTable.deleteConfirmTitle}
            >
              <Tooltip title={dutyLabels.dutiesTable.deleteTooltip}>
                <Button aria-label={formatDeleteDutyAriaLabel(duty.name)} danger icon={<DeleteOutlined />} type="text" />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [isMutating, onDelete, onEdit]
  );

  return (
    <div>
      <Table
        columns={columns}
        dataSource={duties}
        footer={() => (
          <Typography.Text type="secondary">
            {formatLoadedCountLabel(loadedCount, total)}
          </Typography.Text>
        )}
        loading={isLoading}
        locale={{ emptyText: <Empty description={dutyLabels.dutiesTable.emptyState} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: currentPage,
          onChange: onPageChange,
          pageSize,
          showSizeChanger: false,
          total
        }}
        rowKey="id"
      />
    </div>
  );
}
