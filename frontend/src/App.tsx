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
  const [nameFilter, setNameFilter] = useState('');
  const normalizedNameFilter = nameFilter.trim();
  const {
    duties,
    error,
    total,
    currentPage,
    pageSize,
    loadedCount,
    isLoading,
    isMutating,
    loadDuties,
    changePage,
    applyDutyUpdate,
    addDuty,
    removeDuty
  } = useDuties(normalizedNameFilter);
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

  function handleNameFilterChange(nextValue: string): void {
    setNameFilter(nextValue);
  }

  return (
    <Layout className="app-shell">
      <DutiesPageHeader isLoading={isLoading} onRefresh={handleRefresh} />
      <Content className="app-content">
        <CreateDutySection isSubmitting={isMutating} onCreate={handleCreate} />

        {error !== null ? <Alert className="app-alert" message={error} showIcon type="error" /> : null}

        <DutiesSection
          currentPage={currentPage}
          duties={duties}
          filterValue={nameFilter}
          isLoading={isLoading}
          isMutating={isMutating}
          loadedCount={loadedCount}
          pageSize={pageSize}
          onDelete={removeDuty}
          onEdit={setEditingDutyId}
          onFilterChange={handleNameFilterChange}
          onPageChange={changePage}
          total={total}
        />
      </Content>
      <DutyEditorManager dutyId={editingDutyId} onClose={handleCloseEditor} onDutyUpdated={applyDutyUpdate} />
    </Layout>
  );
}
