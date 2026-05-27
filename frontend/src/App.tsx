import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Spin, Tooltip, Typography } from 'antd';
import { lazy, Suspense, useState } from 'react';
import type { Duty } from '@nexplore-duties/contracts';

import { CreateDutyForm } from './components/CreateDutyForm';
import { DutiesTable } from './components/DutiesTable';
import { useDuties } from './hooks/useDuties';
import './App.css';

const { Header, Content } = Layout;
const EditDutyModal = lazy(() => import('./components/EditDutyModal'));

export default function App() {
  const {
    duties,
    error,
    total,
    loadedCount,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isMutating,
    loadDuties,
    loadMore,
    addDuty,
    saveDuty,
    removeDuty
  } = useDuties();
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);

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
            <Typography.Text type="secondary">{`${loadedCount} of ${total} loaded`}</Typography.Text>
          </div>
          <DutiesTable
            duties={duties}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            isMutating={isMutating}
            loadedCount={loadedCount}
            onDelete={removeDuty}
            onEdit={setEditingDuty}
            onLoadMore={loadMore}
            total={total}
          />
        </section>
      </Content>
      {editingDuty !== null ? (
        <Suspense fallback={<Spin fullscreen size="large" />}>
          <EditDutyModal
            duty={editingDuty}
            isSaving={isMutating}
            onCancel={() => setEditingDuty(null)}
            onSave={handleSave}
            open
          />
        </Suspense>
      ) : null}
    </Layout>
  );
}
