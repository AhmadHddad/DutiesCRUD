import type { Duty } from '@nexplore-duties/contracts';
import { useCallback, useEffect, useState } from 'react';

import { type DutyResource, getDuty, updateDuty } from '../api/dutiesApi';
import { dutyLabels } from '../i18n/dutiesLabels';
import { toUserMessage } from '../utils/toUserMessage';

interface UseDutyEditorOptions {
  dutyId: string | null;
  onDutyUpdated(duty: Duty): void;
}

export function useDutyEditor({ dutyId, onDutyUpdated }: UseDutyEditorOptions) {
  const [duty, setDuty] = useState<Duty | null>(null);
  const [currentEtag, setCurrentEtag] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [{ isLoading, isSaving }, setStatusState] = useState({
    isLoading: false,
    isSaving: false
  });

  const applyDutyResource = useCallback((resource: DutyResource) => {
    setDuty(resource.duty);
    setCurrentEtag(resource.etag);
    setConflictMessage(null);
    setError(null);
    onDutyUpdated(resource.duty);
  }, [onDutyUpdated]);

  const applyConflictDuty = useCallback((latestDuty: Duty, etag: string) => {
    setDuty(latestDuty);
    setCurrentEtag(etag);
    setConflictMessage(dutyLabels.editDutyModal.staleConflict);
    setError(null);
    onDutyUpdated(latestDuty);
  }, [onDutyUpdated]);

  const resetEditorState = useCallback(() => {
    setDuty(null);
    setCurrentEtag(null);
    setConflictMessage(null);
    setError(null);
    setStatusState({
      isLoading: false,
      isSaving: false
    });
  }, []);

  const loadDuty = useCallback(async (id: string): Promise<void> => {
    setError(null);
    setStatusState((currentStatus) => ({
      ...currentStatus,
      isLoading: true
    }));

    try {
      const resource = await getDuty(id);
      applyDutyResource(resource);
    } catch (loadError) {
      setError(toUserMessage(loadError));
    } finally {
      setStatusState((currentStatus) => ({
        ...currentStatus,
        isLoading: false
      }));
    }
  }, [applyDutyResource]);

  const saveDuty = useCallback(
    async (name: string): Promise<boolean> => {
      if (dutyId === null || currentEtag === null) {
        return false;
      }

      setStatusState((currentStatus) => ({
        ...currentStatus,
        isSaving: true
      }));
      setError(null);

      try {
        const resource = await updateDuty(dutyId, { name }, currentEtag);
        applyDutyResource(resource);
        return true;
      } catch (saveError) {
        if (isDutyPreconditionFailedError(saveError)) {
          applyConflictDuty(saveError.latestDuty, saveError.etag);
          return false;
        }

        setError(toUserMessage(saveError));
        throw saveError;
      } finally {
        setStatusState((currentStatus) => ({
          ...currentStatus,
          isSaving: false
        }));
      }
    },
    [applyConflictDuty, applyDutyResource, currentEtag, dutyId]
  );

  const refreshDuty = useCallback(async (): Promise<void> => {
    if (dutyId === null) {
      return;
    }

    await loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  useEffect(() => {
    if (dutyId === null) {
      resetEditorState();
      return;
    }

    void loadDuty(dutyId);
  }, [dutyId, loadDuty, resetEditorState]);

  return {
    duty,
    error,
    conflictMessage,
    isLoading,
    isSaving,
    refreshDuty,
    saveDuty
  };
}

function isDutyPreconditionFailedError(
  error: unknown
): error is { message: string; latestDuty: { id: string; name: string }; etag: string } {
  if (!(error instanceof Error) || typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    latestDuty?: unknown;
    etag?: unknown;
  };

  if (typeof candidate.etag !== 'string') {
    return false;
  }

  if (typeof candidate.latestDuty !== 'object' || candidate.latestDuty === null) {
    return false;
  }

  const latestDuty = candidate.latestDuty as { id?: unknown; name?: unknown };
  return typeof latestDuty.id === 'string' && typeof latestDuty.name === 'string';
}
