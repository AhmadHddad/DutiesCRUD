import { Alert, Layout } from 'antd';
import { useState } from 'react';

import { CreateDutySection } from './components/CreateDutySection';
import { DutiesPageHeader } from './components/DutiesPageHeader';
import { DutiesSection } from './components/DutiesSection';
import { DutyEditorManager } from './components/DutyEditorManager';
import { useDuties } from './hooks/useDuties';
import './App.css';

const { Content } = Layout;

export default function App() {
  const {
    duties,
    error,
    total,
    loadedCount,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefreshing,
    isMutating,
    loadDuties,
    loadMore,
    addDuty,
    removeDuty
  } = useDuties();
  const [editingDutyId, setEditingDutyId] = useState<string | null>(null);

  async function handleCreate(name: string): Promise<void> {
    await addDuty(name);
  }

  function handleRefresh(): void {
    void loadDuties();
  }

  function handleCloseEditor(): void {
    setEditingDutyId(null);
  }

  return (
    <Layout className="app-shell">
      <DutiesPageHeader isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      <Content className="app-content">
        <CreateDutySection isSubmitting={isMutating} onCreate={handleCreate} />

        {error !== null ? <Alert className="app-alert" message={error} showIcon type="error" /> : null}

        <DutiesSection
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
      </Content>
      <DutyEditorManager dutyId={editingDutyId} onClose={handleCloseEditor} />
    </Layout>
  );
}
