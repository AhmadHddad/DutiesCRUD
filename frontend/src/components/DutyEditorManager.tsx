import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

import { useDutyEditor } from '../hooks/useDutyEditor';

const EditDutyModal = lazy(() => import('./EditDutyModal'));

interface DutyEditorManagerProps {
  dutyId: string | null;
  onClose(): void;
}

export function DutyEditorManager({ dutyId, onClose }: DutyEditorManagerProps) {
  const {
    duty,
    error,
    conflictMessage,
    isLoading,
    isRefreshing,
    isSaving,
    refreshDuty,
    saveDuty
  } = useDutyEditor({
    dutyId
  });

  async function handleSave(name: string): Promise<boolean> {
    const didSave = await saveDuty(name);
    if (didSave) {
      onClose();
    }

    return didSave;
  }

  if (dutyId === null) {
    return null;
  }

  return (
    <Suspense fallback={<Spin fullscreen size="large" />}>
      <EditDutyModal
        conflictMessage={conflictMessage}
        duty={duty}
        error={error}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        isSaving={isSaving}
        onCancel={onClose}
        onRefresh={() => void refreshDuty()}
        onSave={handleSave}
        open
      />
    </Suspense>
  );
}
