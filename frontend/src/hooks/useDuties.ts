import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DutyListPage } from '@nexplore-duties/contracts';
import { useCallback, useMemo } from 'react';
import axios from 'axios';

import { createDuty, deleteDuty, getDutyPage, updateDuty } from '../api/dutiesApi';

const DUTIES_QUERY_KEY = ['duties'] as const;
const DUTIES_PAGE_LIMIT = 50;

/**
 * Central state manager for duties using React Query.
 * Handles infinite scrolling pagination and provides optimistic/cached UI updates
 * when duties are added, edited, or removed to avoid unnecessary full page refetches.
 */
export function useDuties() {
  const queryClient = useQueryClient();
  const dutiesQuery = useInfiniteQuery({
    queryKey: DUTIES_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      getDutyPage({
        limit: DUTIES_PAGE_LIMIT,
        offset: pageParam
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined
  });

  const addDutyMutation = useMutation({
    mutationFn: (input: { name: string }) => createDuty(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DUTIES_QUERY_KEY });
    }
  });

  const saveDutyMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDuty(id, { name }),
    onSuccess: (updatedDuty) => {
      queryClient.setQueryData<InfiniteData<DutyListPage, number>>(DUTIES_QUERY_KEY, (currentData) => {
        if (currentData === undefined) {
          return currentData;
        }

        return {
          ...currentData,
          pages: currentData.pages.map((page) => ({
            ...page,
            items: page.items.map((duty) => (duty.id === updatedDuty.id ? updatedDuty : duty))
          }))
        };
      });
    }
  });

  const removeDutyMutation = useMutation({
    mutationFn: (id: string) => deleteDuty(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DUTIES_QUERY_KEY });
    }
  });

  const duties = useMemo(() => dutiesQuery.data?.pages.flatMap((page) => page.items) ?? [], [dutiesQuery.data?.pages]);
  const total = dutiesQuery.data?.pages[0]?.total ?? 0;
  const loadedCount = duties.length;

  const addDuty = useCallback(
    async (name: string) => addDutyMutation.mutateAsync({ name }),
    [addDutyMutation]
  );

  const saveDuty = useCallback(
    async (id: string, name: string) => saveDutyMutation.mutateAsync({ id, name }),
    [saveDutyMutation]
  );

  const removeDuty = useCallback(async (id: string) => removeDutyMutation.mutateAsync(id), [removeDutyMutation]);

  const loadMore = useCallback(async () => {
    if (!dutiesQuery.hasNextPage || dutiesQuery.isFetchingNextPage) {
      return;
    }

    await dutiesQuery.fetchNextPage();
  }, [dutiesQuery]);

  const loadDuties = useCallback(async () => {
    await dutiesQuery.refetch();
  }, [dutiesQuery]);

  const error = useMemo(() => {
    const sourceError =
      addDutyMutation.error ?? saveDutyMutation.error ?? removeDutyMutation.error ?? dutiesQuery.error ?? null;
    return sourceError === null ? null : toUserMessage(sourceError);
  }, [addDutyMutation.error, dutiesQuery.error, removeDutyMutation.error, saveDutyMutation.error]);

  return {
    duties,
    error,
    total,
    loadedCount,
    isLoading: dutiesQuery.isLoading,
    isFetchingNextPage: dutiesQuery.isFetchingNextPage,
    hasNextPage: dutiesQuery.hasNextPage ?? false,
    isMutating: addDutyMutation.isPending || saveDutyMutation.isPending || removeDutyMutation.isPending,
    loadDuties,
    loadMore,
    addDuty,
    saveDuty,
    removeDuty
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

  return 'An unexpected error occurred.';
}
