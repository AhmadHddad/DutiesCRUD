import { useCallback, useEffect, useState } from 'react';

import { ApiClientError, createDuty, deleteDuty, getDuties, updateDuty } from '../api/dutiesApi';
import { Duty } from '../types/duty';

export function useDuties() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDuties = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextDuties = await getDuties();
      setDuties(nextDuties);
    } catch (caughtError) {
      setError(toUserMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDuties();
  }, [loadDuties]);

  const addDuty = useCallback(async (name: string) => {
    setIsMutating(true);
    setError(null);

    try {
      const duty = await createDuty({ name });
      setDuties((currentDuties) => [duty, ...currentDuties]);
      return duty;
    } catch (caughtError) {
      setError(toUserMessage(caughtError));
      throw caughtError;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const saveDuty = useCallback(async (id: string, name: string) => {
    setIsMutating(true);
    setError(null);

    try {
      const duty = await updateDuty(id, { name });
      setDuties((currentDuties) => currentDuties.map((currentDuty) => (currentDuty.id === id ? duty : currentDuty)));
      return duty;
    } catch (caughtError) {
      setError(toUserMessage(caughtError));
      throw caughtError;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const removeDuty = useCallback(async (id: string) => {
    setIsMutating(true);
    setError(null);

    try {
      await deleteDuty(id);
      setDuties((currentDuties) => currentDuties.filter((duty) => duty.id !== id));
    } catch (caughtError) {
      setError(toUserMessage(caughtError));
      throw caughtError;
    } finally {
      setIsMutating(false);
    }
  }, []);

  return {
    duties,
    error,
    isLoading,
    isMutating,
    loadDuties,
    addDuty,
    saveDuty,
    removeDuty
  };
}

function toUserMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.requestId === undefined ? error.message : `${error.message} Request ID: ${error.requestId}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
