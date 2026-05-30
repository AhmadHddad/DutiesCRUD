import axios from 'axios';

import { dutyLabels } from '../i18n/dutiesLabels';

export function toUserMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string; requestId?: string } } | undefined;
    const message = data?.error?.message ?? error.message;
    const requestId = data?.error?.requestId ?? error.response?.headers?.['x-request-id'];

    return requestId ? `${message} Request ID: ${requestId}` : message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return dutyLabels.errors.unexpected;
}
