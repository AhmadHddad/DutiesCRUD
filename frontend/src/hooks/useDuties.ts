import type { Duty, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createDuty, deleteDuty, getDutyPage } from '../api/dutiesApi';
import { toUserMessage } from '../utils/toUserMessage';

const DUTIES_PAGE_LIMIT = 50;

/**
 * Central state manager for duties using direct API calls.
 * Handles paginated loading and explicit UI updates when duties change.
 */
export function useDuties(nameFilter: string) {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [{ total, currentPage }, setListState] = useState({
    total: 0,
    currentPage: 1
  });
  const [{ isLoading, isMutating }, setStatusState] = useState({
    isLoading: true,
    isMutating: false
  });
  const [error, setError] = useState<string | null>(null);
  const previousFilterRef = useRef(nameFilter);

  const fetchPage = useCallback(async (page: number, filter: string): Promise<DutyListPage> => {
    const query: DutyListQuery = {
      limit: DUTIES_PAGE_LIMIT,
      offset: (page - 1) * DUTIES_PAGE_LIMIT
    };

    if (filter !== '') {
      query.name = filter;
    }

    return getDutyPage(query);
  }, []);

  const requestPage = useCallback(async (page: number, filter: string): Promise<{ page: number; pageData: DutyListPage }> => {
    const requestedPage = Math.max(page, 1);
    const pageData = await fetchPage(requestedPage, filter);

    if (pageData.items.length > 0 || pageData.total === 0 || requestedPage === 1) {
      return { page: requestedPage, pageData };
    }

    const lastPage = Math.max(1, Math.ceil(pageData.total / DUTIES_PAGE_LIMIT));
    if (lastPage === requestedPage) {
      return { page: requestedPage, pageData };
    }

    return {
      page: lastPage,
      pageData: await fetchPage(lastPage, filter)
    };
  }, [fetchPage]);

  const applyPageData = useCallback((page: number, pageData: DutyListPage) => {
    setDuties(pageData.items);
    setListState({
      currentPage: page,
      total: pageData.total
    });
    setError(null);
  }, []);

  const loadPage = useCallback(async (page: number, filter: string): Promise<void> => {
    setError(null);
    setStatusState((currentStatus) => ({
      ...currentStatus,
      isLoading: true
    }));

    try {
      const { page: resolvedPage, pageData } = await requestPage(page, filter);
      applyPageData(resolvedPage, pageData);
    } catch (loadError) {
      setError(toUserMessage(loadError));
    } finally {
      setStatusState((currentStatus) => ({
        ...currentStatus,
        isLoading: false
      }));
    }
  }, [applyPageData, requestPage]);

  useEffect(() => {
    const filterChanged = previousFilterRef.current !== nameFilter;

    previousFilterRef.current = nameFilter;

    if (filterChanged && currentPage !== 1) {
      setListState((currentListState) => ({
        ...currentListState,
        currentPage: 1
      }));
      return;
    }

    void loadPage(currentPage, nameFilter);
  }, [loadPage, nameFilter, currentPage]);

  const loadDuties = useCallback(async () => {
    await loadPage(currentPage, nameFilter);
  }, [currentPage, loadPage, nameFilter]);

  const changePage = useCallback((page: number) => {
    setListState((currentListState) => ({
      ...currentListState,
      currentPage: page
    }));
  }, []);

  const addDuty = useCallback(async (name: string) => {
    setStatusState((currentStatus) => ({
      ...currentStatus,
      isMutating: true
    }));
    setError(null);

    try {
      await createDuty({ name });
      await loadPage(currentPage, nameFilter);
    } catch (mutationError) {
      setError(toUserMessage(mutationError));
      throw mutationError;
    } finally {
      setStatusState((currentStatus) => ({
        ...currentStatus,
        isMutating: false
      }));
    }
  }, [currentPage, loadPage, nameFilter]);

  const removeDuty = useCallback(async (id: string) => {
    setStatusState((currentStatus) => ({
      ...currentStatus,
      isMutating: true
    }));
    setError(null);

    try {
      await deleteDuty(id);
      await loadPage(currentPage, nameFilter);
    } catch (mutationError) {
      setError(toUserMessage(mutationError));
      throw mutationError;
    } finally {
      setStatusState((currentStatus) => ({
        ...currentStatus,
        isMutating: false
      }));
    }
  }, [currentPage, loadPage, nameFilter]);

  const applyDutyUpdate = useCallback((updatedDuty: Duty) => {
    setDuties((currentDuties) => {
      const dutyIndex = currentDuties.findIndex((duty) => duty.id === updatedDuty.id);

      if (dutyIndex === -1) {
        return currentDuties;
      }

      const currentDuty = currentDuties[dutyIndex];
      if (!currentDuty) {
        return currentDuties;
      }

      if (currentDuty.name === updatedDuty.name) {
        return currentDuties;
      }

      const nextDuties = [...currentDuties];
      nextDuties[dutyIndex] = updatedDuty;
      return nextDuties;
    });
  }, []);

  return {
    duties,
    error,
    total,
    currentPage,
    pageSize: DUTIES_PAGE_LIMIT,
    loadedCount: duties.length,
    isLoading,
    isMutating,
    loadDuties,
    changePage,
    applyDutyUpdate,
    addDuty,
    removeDuty
  };
}
