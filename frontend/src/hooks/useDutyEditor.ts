import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DutyListPage } from '@nexplore-duties/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import { getDuty, updateDuty } from '../api/dutiesApi';
import { dutyLabels } from '../i18n/dutiesLabels';
import { DUTIES_QUERY_KEY, mergeDutyIntoPages } from './useDuties';

const dutyQueryKey = (id: string) => ['duty', id] as const;

interface UseDutyEditorOptions {
  dutyId: string | null;
}

export function useDutyEditor({ dutyId }: UseDutyEditorOptions) {
  const queryClient = useQueryClient();
  const [currentEtag, setCurrentEtag] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const dutyQuery = useQuery({
    queryKey: dutyId === null ? ['duty', 'idle'] : dutyQueryKey(dutyId),
    queryFn: async () => getDuty(dutyId as string),
    enabled: dutyId !== null,
    retry: false
  });

  useEffect(() => {
    if (dutyQuery.data === undefined) {
      return;
    }

    setCurrentEtag(dutyQuery.data.etag);
    queryClient.setQueryData<InfiniteData<DutyListPage, number>>(DUTIES_QUERY_KEY, (currentData) =>
      mergeDutyIntoPages(currentData, dutyQuery.data.duty)
    );
  }, [dutyQuery.data, queryClient]);

  useEffect(() => {
    if (dutyId === null) {
      setCurrentEtag(null);
      setConflictMessage(null);
    }
  }, [dutyId]);

  const saveDutyMutation = useMutation({
    mutationFn: async ({ id, name, etag }: { id: string; name: string; etag: string }) => updateDuty(id, { name }, etag)
  });

  const saveDuty = useCallback(
    async (name: string): Promise<boolean> => {
      if (dutyId === null || currentEtag === null) {
        return false;
      }

      try {
        const resource = await saveDutyMutation.mutateAsync({ id: dutyId, name, etag: currentEtag });
        setCurrentEtag(resource.etag);
        setConflictMessage(null);
        queryClient.setQueryData(dutyQueryKey(dutyId), resource);
        queryClient.setQueryData<InfiniteData<DutyListPage, number>>(DUTIES_QUERY_KEY, (currentData) =>
          mergeDutyIntoPages(currentData, resource.duty)
        );
        return true;
      } catch (error) {
        if (isDutyPreconditionFailedError(error)) {
          setCurrentEtag(error.etag);
          setConflictMessage(dutyLabels.editDutyModal.staleConflict);
          queryClient.setQueryData(dutyQueryKey(dutyId), {
            duty: error.latestDuty,
            etag: error.etag
          });
          queryClient.setQueryData<InfiniteData<DutyListPage, number>>(DUTIES_QUERY_KEY, (currentData) =>
            mergeDutyIntoPages(currentData, error.latestDuty)
          );
          return false;
        }

        throw error;
      }
    },
    [currentEtag, dutyId, queryClient, saveDutyMutation]
  );

  const refreshDuty = useCallback(async (): Promise<void> => {
    if (dutyId === null) {
      return;
    }

    const result = await dutyQuery.refetch();
    if (result.error === null) {
      setConflictMessage(null);
    }
  }, [dutyId, dutyQuery]);

  const error = useMemo(() => {
    const sourceError = dutyQuery.error ?? saveDutyMutation.error ?? null;
    if (sourceError === null || isDutyPreconditionFailedError(sourceError)) {
      return null;
    }

    return toUserMessage(sourceError);
  }, [dutyQuery.error, saveDutyMutation.error]);

  return {
    duty: dutyQuery.data?.duty ?? null,
    error,
    conflictMessage,
    isLoading: dutyQuery.isPending,
    isFetching: dutyQuery.isFetching,
    isRefreshing: dutyQuery.isFetching && !dutyQuery.isPending,
    isSaving: saveDutyMutation.isPending,
    refreshDuty,
    saveDuty
  };
}

function toUserMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string; requestId?: string } } | undefined;
    const message = data?.error?.message ?? error.message;
    const requestId = data?.error?.requestId ?? error.response?.headers?.['x-request-id'];

    return requestId === undefined ? message : `${message} Request ID: ${requestId}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return dutyLabels.errors.unexpected;
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
