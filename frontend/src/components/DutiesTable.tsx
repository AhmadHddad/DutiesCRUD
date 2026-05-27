import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Empty, Popconfirm, Space, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useRef } from 'react';
import type { Duty } from '@nexplore-duties/contracts';

import {
  dutyLabels,
  formatDeleteDutyAriaLabel,
  formatEditDutyAriaLabel,
  formatLoadedCountLabel
} from '../i18n/dutiesLabels';

interface DutiesTableProps {
  duties: Duty[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isMutating: boolean;
  loadedCount: number;
  total: number;
  onDelete(id: string): Promise<void>;
  onEdit(duty: Duty): void;
  onLoadMore(): Promise<void>;
}

export function DutiesTable({
  duties,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isMutating,
  loadedCount,
  total,
  onDelete,
  onEdit,
  onLoadMore
}: DutiesTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
                onClick={() => onEdit(duty)}
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

  useEffect(() => {
    const scrollBody = containerRef.current?.querySelector('.ant-table-body, .ant-table-tbody-virtual-holder');

    if (!(scrollBody instanceof HTMLElement)) {
      return;
    }

    const handleScroll = () => {
      const remainingScroll = scrollBody.scrollHeight - scrollBody.scrollTop - scrollBody.clientHeight;

      if (remainingScroll <= 120 && hasNextPage && !isFetchingNextPage) {
        void onLoadMore();
      }
    };

    scrollBody.addEventListener('scroll', handleScroll);

    return () => {
      scrollBody.removeEventListener('scroll', handleScroll);
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div ref={containerRef}>
      <Table
        columns={columns}
        dataSource={duties}
        footer={() => (
          <Typography.Text type="secondary">
            {isFetchingNextPage ? dutyLabels.dutiesTable.loadingMore : formatLoadedCountLabel(loadedCount, total)}
          </Typography.Text>
        )}
        loading={isLoading}
        locale={{ emptyText: <Empty description={dutyLabels.dutiesTable.emptyState} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={false}
        rowKey="id"
        scroll={{ y: 480 }}
        virtual
      />
    </div>
  );
}
