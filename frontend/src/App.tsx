import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Spin, Tooltip, Typography } from 'antd';
import { lazy, Suspense, useState } from 'react';

import { CreateDutyForm } from './components/CreateDutyForm';
import { DutiesTable } from './components/DutiesTable';
import { useDutyEditor } from './hooks/useDutyEditor';
import { useDuties } from './hooks/useDuties';
import { dutyLabels, formatLoadedCountLabel } from './i18n/dutiesLabels';
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
    removeDuty
  } = useDuties();
  const [editingDutyId, setEditingDutyId] = useState<string | null>(null);
  const {
    duty: editingDuty,
    error: editError,
    conflictMessage,
    isLoading: isEditLoading,
    isRefreshing: isEditRefreshing,
    isSaving,
    refreshDuty,
    saveDuty
  } = useDutyEditor({
    dutyId: editingDutyId
  });

  async function handleCreate(name: string): Promise<void> {
    await addDuty(name);
  }

  async function handleSave(name: string): Promise<boolean> {
    const didSave = await saveDuty(name);
    if (didSave) {
      setEditingDutyId(null);
    }

    return didSave;
  }

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="app-header__inner">
          <div>
            <Typography.Title className="app-title" level={1}>
              {dutyLabels.app.title}
            </Typography.Title>
            <Typography.Text className="app-subtitle">{dutyLabels.app.subtitle}</Typography.Text>
          </div>
          <Tooltip title={dutyLabels.app.refreshTooltip}>
            <Button
              aria-label={dutyLabels.app.refreshAriaLabel}
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
              {dutyLabels.app.createSectionTitle}
            </Typography.Title>
          </div>
          <CreateDutyForm isSubmitting={isMutating} onCreate={handleCreate} />
        </section>

        {error !== null ? <Alert className="app-alert" message={error} showIcon type="error" /> : null}

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
            onDelete={removeDuty}
            onEdit={setEditingDutyId}
            onLoadMore={loadMore}
            total={total}
          />
        </section>
      </Content>
      {editingDutyId !== null ? (
        <Suspense fallback={<Spin fullscreen size="large" />}>
          <EditDutyModal
            conflictMessage={conflictMessage}
            duty={editingDuty}
            error={editError}
            isLoading={isEditLoading}
            isRefreshing={isEditRefreshing}
            isSaving={isSaving}
            onCancel={() => setEditingDutyId(null)}
            onRefresh={() => void refreshDuty()}
            onSave={handleSave}
            open
          />
        </Suspense>
      ) : null}
    </Layout>
  );
}
