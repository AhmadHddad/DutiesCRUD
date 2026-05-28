import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DUTY_NAME_MAX_LENGTH, type Duty, type DutyInput, type DutyListPage, type DutyListQuery } from '@nexplore-duties/contracts';
import { AxiosError, AxiosHeaders } from 'axios';

import App from './App';
import {
  createDuty,
  deleteDuty,
  DutyPreconditionFailedError,
  getDuty,
  getDutyPage,
  updateDuty
} from './api/dutiesApi';
import {
  dutyLabels,
  formatDeleteDutyAriaLabel,
  formatEditDutyAriaLabel,
  formatLoadedCountLabel
} from './i18n/dutiesLabels';

jest.mock('./api/dutiesApi', () => {
  class MockDutyPreconditionFailedError extends Error {
    public readonly latestDuty: Duty;
    public readonly etag: string;

    public constructor(message: string, latestDuty: Duty, etag: string) {
      super(message);
      this.name = 'DutyPreconditionFailedError';
      this.latestDuty = latestDuty;
      this.etag = etag;
    }
  }

  return {
    DutyPreconditionFailedError: MockDutyPreconditionFailedError,
    getDuty: jest.fn(),
    getDutyPage: jest.fn(),
    createDuty: jest.fn(),
    updateDuty: jest.fn(),
    deleteDuty: jest.fn()
  };
});

const mockedGetDutyPage = jest.mocked(getDutyPage);
const mockedGetDuty = jest.mocked(getDuty);
const mockedCreateDuty = jest.mocked(createDuty);
const mockedUpdateDuty = jest.mocked(updateDuty);
const mockedDeleteDuty = jest.mocked(deleteDuty);
let dutiesStore: Duty[] = [];
let nextId = 1;
let dutyEtags: Record<string, string> = {};

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dutiesStore = [];
    nextId = 1;
    dutyEtags = {};
    mockedGetDutyPage.mockImplementation(async ({ limit, offset }: DutyListQuery) => createPage(limit, offset));
    mockedGetDuty.mockImplementation(async (id: string) => {
      const duty = dutiesStore.find((currentDuty) => currentDuty.id === id);

      if (duty === undefined) {
        throw new Error('Duty was not found.');
      }

      return {
        duty,
        etag: dutyEtags[id] ?? `"duty-${id}-v1"`
      };
    });
    mockedCreateDuty.mockImplementation(async ({ name }: DutyInput) => {
      const duty = { id: String(nextId++), name };
      dutiesStore = [duty, ...dutiesStore];
      dutyEtags[duty.id] = `"duty-${duty.id}-v1"`;
      return duty;
    });
    mockedUpdateDuty.mockImplementation(async (id: string, { name }: DutyInput, etag: string) => {
      const currentDuty = dutiesStore.find((duty) => duty.id === id);
      const currentEtag = dutyEtags[id] ?? `"duty-${id}-v1"`;

      if (currentDuty === undefined) {
        throw new Error('Duty was not found.');
      }

      if (etag !== currentEtag) {
        throw new DutyPreconditionFailedError(
          'Duty has changed since you opened it. The latest duty has been loaded.',
          currentDuty,
          currentEtag
        );
      }

      const duty = { id, name };
      dutiesStore = dutiesStore.map((currentDuty) => (currentDuty.id === id ? duty : currentDuty));
      const nextVersion = Number(currentEtag.match(/-v(\d+)"/)?.[1] ?? '1') + 1;
      const nextEtag = `"duty-${id}-v${nextVersion}"`;
      dutyEtags[id] = nextEtag;
      return {
        duty,
        etag: nextEtag
      };
    });
    mockedDeleteDuty.mockImplementation(async (id: string) => {
      dutiesStore = dutiesStore.filter((duty) => duty.id !== id);
    });
  });

  it('renders duties returned by the API', async () => {
    dutiesStore = [{ id: '1', name: 'Plan release' }];
    dutyEtags['1'] = '"duty-1-v1"';

    renderApp();

    expect(await screen.findByText('Plan release')).toBeInTheDocument();
    expect(screen.getAllByText(formatLoadedCountLabel(1, 1))).toHaveLength(2);
  });

  it('renders duty names with angle brackets as plain text', async () => {
    dutiesStore = [{ id: '1', name: 'learn about <a> and 5 < 2 and 3>2' }];
    dutyEtags['1'] = '"duty-1-v1"';

    renderApp();

    expect(await screen.findByText('learn about <a> and 5 < 2 and 3>2')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('validates the create form', async () => {
    const user = userEvent.setup();

    renderApp();

    await screen.findByText(dutyLabels.dutiesTable.emptyState);
    await user.click(screen.getByRole('button', { name: labelAtEnd(dutyLabels.createDutyForm.submitButton) }));

    expect(await screen.findByText('Duty name is required.')).toBeInTheDocument();
    expect(mockedCreateDuty).not.toHaveBeenCalled();
  });

  it('creates a duty', async () => {
    const user = userEvent.setup();

    renderApp();

    await screen.findByText(dutyLabels.dutiesTable.emptyState);
    await user.type(screen.getByRole('textbox', { name: dutyLabels.createDutyForm.nameAriaLabel }), 'Write README');
    await user.click(screen.getByRole('button', { name: labelAtEnd(dutyLabels.createDutyForm.submitButton) }));

    expect(mockedCreateDuty).toHaveBeenCalledWith({ name: 'Write README' });
    expect(await screen.findByText('Write README')).toBeInTheDocument();
  });

  it('trims whitespace before creating a duty', async () => {
    const user = userEvent.setup();

    renderApp();

    await screen.findByText(dutyLabels.dutiesTable.emptyState);
    await user.type(screen.getByRole('textbox', { name: dutyLabels.createDutyForm.nameAriaLabel }), '  Write README  ');
    await user.click(screen.getByRole('button', { name: labelAtEnd(dutyLabels.createDutyForm.submitButton) }));

    expect(mockedCreateDuty).toHaveBeenCalledWith({ name: 'Write README' });
    expect(await screen.findByText('Write README')).toBeInTheDocument();
  });

  it('rejects over-length names in the create form', async () => {
    const user = userEvent.setup();
    const overLengthName = 'a'.repeat(DUTY_NAME_MAX_LENGTH + 1);

    renderApp();

    await screen.findByText(dutyLabels.dutiesTable.emptyState);
    fireEvent.change(screen.getByRole('textbox', { name: dutyLabels.createDutyForm.nameAriaLabel }), {
      target: { value: overLengthName }
    });
    await user.click(screen.getByRole('button', { name: labelAtEnd(dutyLabels.createDutyForm.submitButton) }));

    expect(await screen.findByText(`Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`)).toBeInTheDocument();
    expect(mockedCreateDuty).not.toHaveBeenCalled();
  });

  it('creates a duty with angle brackets and renders it as plain text', async () => {
    const user = userEvent.setup();
    const name = 'learn about <a> and 5 < 2 and 3>2';

    renderApp();

    await screen.findByText(dutyLabels.dutiesTable.emptyState);
    await user.type(screen.getByRole('textbox', { name: dutyLabels.createDutyForm.nameAriaLabel }), name);
    await user.click(screen.getByRole('button', { name: labelAtEnd(dutyLabels.createDutyForm.submitButton) }));

    expect(mockedCreateDuty).toHaveBeenCalledWith({ name });
    expect(await screen.findByText(name)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('updates a duty', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Old name' }];
    dutyEtags['1'] = '"duty-1-v3"';

    renderApp();

    await screen.findByText('Old name');
    await user.click(screen.getByRole('button', { name: formatEditDutyAriaLabel('Old name') }));

    const dialog = await screen.findByRole('dialog', { name: dutyLabels.editDutyModal.title });
    const input = within(dialog).getByRole('textbox', { name: dutyLabels.editDutyModal.nameAriaLabel });
    await user.clear(input);
    await user.type(input, 'New name');
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    await waitFor(() => expect(mockedGetDuty).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(mockedUpdateDuty).toHaveBeenCalledWith('1', { name: 'New name' }, '"duty-1-v3"'));
    expect(await screen.findByText('New name')).toBeInTheDocument();
  });

  it('updates a duty with angle brackets and keeps it rendered as plain text', async () => {
    const user = userEvent.setup();
    const name = '<b>New name</b>';
    dutiesStore = [{ id: '1', name: 'Old name' }];
    dutyEtags['1'] = '"duty-1-v1"';

    renderApp();

    await screen.findByText('Old name');
    await user.click(screen.getByRole('button', { name: formatEditDutyAriaLabel('Old name') }));

    const dialog = await screen.findByRole('dialog', { name: dutyLabels.editDutyModal.title });
    const input = within(dialog).getByRole('textbox', { name: dutyLabels.editDutyModal.nameAriaLabel });
    await user.clear(input);
    await user.type(input, name);
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    await waitFor(() => expect(mockedUpdateDuty).toHaveBeenCalledWith('1', { name }, '"duty-1-v1"'));
    expect(await screen.findByText(name)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('validates the edit form', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Old name' }];
    dutyEtags['1'] = '"duty-1-v1"';

    renderApp();

    await screen.findByText('Old name');
    await user.click(screen.getByRole('button', { name: formatEditDutyAriaLabel('Old name') }));

    const dialog = await screen.findByRole('dialog', { name: dutyLabels.editDutyModal.title });
    const input = within(dialog).getByRole('textbox', { name: dutyLabels.editDutyModal.nameAriaLabel });
    await user.clear(input);
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    expect(await within(dialog).findByText('Duty name is required.')).toBeInTheDocument();
    expect(mockedUpdateDuty).not.toHaveBeenCalled();
  });

  it('rejects over-length names in the edit form', async () => {
    const user = userEvent.setup();
    const overLengthName = 'a'.repeat(DUTY_NAME_MAX_LENGTH + 1);
    dutiesStore = [{ id: '1', name: 'Old name' }];
    dutyEtags['1'] = '"duty-1-v1"';

    renderApp();

    await screen.findByText('Old name');
    await user.click(screen.getByRole('button', { name: formatEditDutyAriaLabel('Old name') }));

    const dialog = await screen.findByRole('dialog', { name: dutyLabels.editDutyModal.title });
    fireEvent.change(within(dialog).getByRole('textbox', { name: dutyLabels.editDutyModal.nameAriaLabel }), {
      target: { value: overLengthName }
    });
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    expect(
      await within(dialog).findByText(`Duty name must be ${DUTY_NAME_MAX_LENGTH} characters or fewer.`)
    ).toBeInTheDocument();
    expect(mockedUpdateDuty).not.toHaveBeenCalled();
  });

  it('refreshes the edit form when a stale save hits a concurrency conflict', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Server latest name' }];
    dutyEtags['1'] = '"duty-1-v2"';
    let firstAttempt = true;

    mockedGetDuty.mockImplementation(async (id: string) => ({
      duty: { id, name: 'Initial fresh name' },
      etag: '"duty-1-v1"'
    }));
    mockedUpdateDuty.mockImplementation(async (id: string, { name }: DutyInput) => {
      if (firstAttempt) {
        firstAttempt = false;
        throw new DutyPreconditionFailedError(
          'Duty has changed since you opened it. The latest duty has been loaded.',
          { id, name: 'Server latest name' },
          '"duty-1-v2"'
        );
      }

      const duty = { id, name };
      dutiesStore = [duty];
      dutyEtags[id] = '"duty-1-v3"';
      return { duty, etag: '"duty-1-v3"' };
    });

    renderApp();

    await screen.findByText('Server latest name');
    await user.click(screen.getByRole('button', { name: formatEditDutyAriaLabel('Server latest name') }));

    const dialog = await screen.findByRole('dialog', { name: dutyLabels.editDutyModal.title });
    const input = within(dialog).getByRole('textbox', { name: dutyLabels.editDutyModal.nameAriaLabel });
    await waitFor(() => expect(input).toHaveValue('Initial fresh name'));

    await user.clear(input);
    await user.type(input, 'My stale change');
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    expect(await within(dialog).findByText(dutyLabels.editDutyModal.staleConflict)).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue('Server latest name'));

    await user.clear(input);
    await user.type(input, 'Retry with latest value');
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    await waitFor(() =>
      expect(mockedUpdateDuty).toHaveBeenLastCalledWith('1', { name: 'Retry with latest value' }, '"duty-1-v2"')
    );
    expect(await screen.findByText('Retry with latest value')).toBeInTheDocument();
  });

  it('lets the user manually refresh the edit form after a concurrency conflict', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Server latest name' }];
    dutyEtags['1'] = '"duty-1-v2"';
    let getDutyCallCount = 0;

    mockedGetDuty.mockImplementation(async (id: string) => {
      getDutyCallCount += 1;

      if (getDutyCallCount === 1) {
        return {
          duty: { id, name: 'Initial fresh name' },
          etag: '"duty-1-v1"'
        };
      }

      return {
        duty: { id, name: 'Newest server value' },
        etag: '"duty-1-v3"'
      };
    });
    mockedUpdateDuty.mockImplementation(async (id: string) => {
      throw new DutyPreconditionFailedError(
        'Duty has changed since you opened it. The latest duty has been loaded.',
        { id, name: 'Server latest name' },
        '"duty-1-v2"'
      );
    });

    renderApp();

    await screen.findByText('Server latest name');
    await user.click(screen.getByRole('button', { name: formatEditDutyAriaLabel('Server latest name') }));

    const dialog = await screen.findByRole('dialog', { name: dutyLabels.editDutyModal.title });
    const input = within(dialog).getByRole('textbox', { name: dutyLabels.editDutyModal.nameAriaLabel });
    await waitFor(() => expect(input).toHaveValue('Initial fresh name'));

    await user.clear(input);
    await user.type(input, 'My stale change');
    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.saveButton }));

    expect(await within(dialog).findByText(dutyLabels.editDutyModal.staleConflict)).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue('Server latest name'));

    await user.click(within(dialog).getByRole('button', { name: dutyLabels.editDutyModal.refreshButton }));

    await waitFor(() => expect(mockedGetDuty).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(input).toHaveValue('Newest server value'));
    await waitFor(() =>
      expect(within(dialog).queryByText(dutyLabels.editDutyModal.staleConflict)).not.toBeInTheDocument()
    );
  });

  it('deletes a duty', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Remove me' }];
    dutyEtags['1'] = '"duty-1-v1"';

    renderApp();

    await screen.findByText('Remove me');
    await user.click(screen.getByRole('button', { name: formatDeleteDutyAriaLabel('Remove me') }));
    await user.click(await screen.findByRole('button', { name: dutyLabels.dutiesTable.deleteConfirmOk }));

    await waitFor(() => expect(mockedDeleteDuty).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(screen.queryByText('Remove me')).not.toBeInTheDocument());
  });

  it('loads more duties when the table scroll reaches the bottom', async () => {
    dutiesStore = Array.from({ length: 55 }, (_, index) => ({
      id: String(index + 1),
      name: `Duty ${index + 1}`
    }));
    dutyEtags = Object.fromEntries(dutiesStore.map((duty) => [duty.id, `"duty-${duty.id}-v1"`]));

    renderApp();

    expect(await screen.findByText('Duty 1')).toBeInTheDocument();
    expect(screen.queryByText('Duty 55')).not.toBeInTheDocument();

    const scrollBody = (document.querySelector('.ant-table-body, .ant-table-tbody-virtual-holder') ??
      null) as HTMLDivElement | null;

    expect(scrollBody).not.toBeNull();
    if (scrollBody === null) {
      throw new Error('Expected a virtualized table scroll container.');
    }

    Object.defineProperty(scrollBody, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(scrollBody, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(scrollBody, 'scrollTop', { configurable: true, value: 750, writable: true });

    fireEvent.scroll(scrollBody);

    await waitFor(() => expect(mockedGetDutyPage).toHaveBeenCalledWith({ limit: 50, offset: 50 }));
    await waitFor(() => expect(screen.getAllByText(formatLoadedCountLabel(55, 55))).toHaveLength(2));
  });

  it('shows API errors', async () => {
    const error = new AxiosError('Backend unavailable');
    error.response = {
      data: { error: { message: 'Backend unavailable' } },
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() }
    };
    mockedGetDutyPage.mockRejectedValue(error);

    renderApp();

    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument();
  });

  it('disables refresh while duties are refetching', async () => {
    const user = userEvent.setup();
    const refetchRequest = createDeferred<DutyListPage>();
    let getDutyPageCallCount = 0;
    dutiesStore = [{ id: '1', name: 'Plan release' }];
    dutyEtags['1'] = '"duty-1-v1"';

    mockedGetDutyPage.mockImplementation(async ({ limit, offset }: DutyListQuery) => {
      getDutyPageCallCount += 1;

      if (getDutyPageCallCount === 1) {
        return createPage(limit, offset);
      }

      return refetchRequest.promise;
    });

    renderApp();

    await screen.findByText('Plan release');
    const refreshButton = screen.getByRole('button', { name: dutyLabels.app.refreshAriaLabel });
    expect(refreshButton).not.toBeDisabled();

    await user.click(refreshButton);

    await waitFor(() => expect(refreshButton).toBeDisabled());

    refetchRequest.resolve(createPage(50, 0));

    await waitFor(() => expect(refreshButton).not.toBeDisabled());
  });
});

function createPage(limit: number, offset: number): DutyListPage {
  const items = dutiesStore.slice(offset, offset + limit);
  return {
    items,
    total: dutiesStore.length,
    limit,
    offset,
    nextOffset: offset + items.length < dutiesStore.length ? offset + items.length : null
  };
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function labelAtEnd(label: string): RegExp {
  return new RegExp(`${escapeRegExp(label)}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject
  };
}
