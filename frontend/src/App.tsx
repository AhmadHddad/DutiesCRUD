import { DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Layout, Popconfirm, Space, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import { CreateDutyForm } from './components/CreateDutyForm';
import { EditDutyModal } from './components/EditDutyModal';
import { useDuties } from './hooks/useDuties';
import { Duty } from './types/duty';
import './App.css';

const { Header, Content } = Layout;

export default function App() {
  const { duties, error, isLoading, isMutating, loadDuties, addDuty, saveDuty, removeDuty } = useDuties();
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);

  const columns = useMemo<ColumnsType<Duty>>(
    () => [
      {
        title: 'Duty',
        dataIndex: 'name',
        key: 'name',
        render: (name: string) => <Typography.Text>{name}</Typography.Text>
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'right',
        width: 130,
        render: (_value, duty) => (
          <Space size="small">
            <Tooltip title="Edit">
              <Button
                aria-label={`Edit ${duty.name}`}
                icon={<EditOutlined />}
                onClick={() => setEditingDuty(duty)}
                type="text"
              />
            </Tooltip>
            <Popconfirm
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: isMutating }}
              okText="Delete"
              onConfirm={() => removeDuty(duty.id)}
              title="Delete duty?"
            >
              <Tooltip title="Delete">
                <Button aria-label={`Delete ${duty.name}`} danger icon={<DeleteOutlined />} type="text" />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [isMutating, removeDuty]
  );

  async function handleCreate(name: string): Promise<void> {
    await addDuty(name);
  }

  async function handleSave(name: string): Promise<void> {
    if (editingDuty === null) {
      return;
    }

    await saveDuty(editingDuty.id, name);
    setEditingDuty(null);
  }

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="app-header__inner">
          <div>
            <Typography.Title className="app-title" level={1}>
              Duties
            </Typography.Title>
            <Typography.Text className="app-subtitle">Shared operational to-do list</Typography.Text>
          </div>
          <Tooltip title="Refresh">
            <Button
              aria-label="Refresh duties"
              disabled={isLoading}
              icon={<ReloadOutlined />}
              onClick={() => void loadDuties()}
            />
          </Tooltip>
        </div>
      </Header>
      <Content className="app-content">
        <section className="workspace-panel" aria-labelledby="create-duty-heading">
          <div className="section-heading">
            <Typography.Title id="create-duty-heading" level={2}>
              New duty
            </Typography.Title>
          </div>
          <CreateDutyForm isSubmitting={isMutating} onCreate={handleCreate} />
        </section>

        {error !== null ? <Alert className="app-alert" message={error} showIcon type="error" /> : null}

        <section className="workspace-panel" aria-labelledby="duties-heading">
          <div className="section-heading section-heading--table">
            <Typography.Title id="duties-heading" level={2}>
              Current duties
            </Typography.Title>
            <Typography.Text type="secondary">{duties.length} total</Typography.Text>
          </div>
          <Table
            columns={columns}
            dataSource={duties}
            loading={isLoading}
            locale={{ emptyText: <Empty description="No duties yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            pagination={false}
            rowKey="id"
          />
        </section>
      </Content>
      {editingDuty !== null ? (
        <EditDutyModal
          duty={editingDuty}
          isSaving={isMutating}
          onCancel={() => setEditingDuty(null)}
          onSave={handleSave}
          open
        />
      ) : null}
    </Layout>
  );
}
