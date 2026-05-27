import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Duty, DutyInput, DutyListPage, DutyListQuery } from '@nexplore-duties/contracts';
import { AxiosError, AxiosHeaders } from 'axios';

import App from './App';
import { createDuty, deleteDuty, getDutyPage, updateDuty } from './api/dutiesApi';

jest.mock('./api/dutiesApi', () => {
  return {
    getDutyPage: jest.fn(),
    createDuty: jest.fn(),
    updateDuty: jest.fn(),
    deleteDuty: jest.fn()
  };
});

const mockedGetDutyPage = jest.mocked(getDutyPage);
const mockedCreateDuty = jest.mocked(createDuty);
const mockedUpdateDuty = jest.mocked(updateDuty);
const mockedDeleteDuty = jest.mocked(deleteDuty);
let dutiesStore: Duty[] = [];
let nextId = 1;

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dutiesStore = [];
    nextId = 1;
    mockedGetDutyPage.mockImplementation(async ({ limit, offset }: DutyListQuery) => createPage(limit, offset));
    mockedCreateDuty.mockImplementation(async ({ name }: DutyInput) => {
      const duty = { id: String(nextId++), name };
      dutiesStore = [duty, ...dutiesStore];
      return duty;
    });
    mockedUpdateDuty.mockImplementation(async (id: string, { name }: DutyInput) => {
      const duty = { id, name };
      dutiesStore = dutiesStore.map((currentDuty) => (currentDuty.id === id ? duty : currentDuty));
      return duty;
    });
    mockedDeleteDuty.mockImplementation(async (id: string) => {
      dutiesStore = dutiesStore.filter((duty) => duty.id !== id);
    });
  });

  it('renders duties returned by the API', async () => {
    dutiesStore = [{ id: '1', name: 'Plan release' }];

    renderApp();

    expect(await screen.findByText('Plan release')).toBeInTheDocument();
    expect(screen.getAllByText('1 of 1 loaded')).toHaveLength(2);
  });

  it('validates the create form', async () => {
    const user = userEvent.setup();

    renderApp();

    await screen.findByText('No duties yet');
    await user.click(screen.getByRole('button', { name: /add duty/i }));

    expect(await screen.findByText('Duty name is required.')).toBeInTheDocument();
    expect(mockedCreateDuty).not.toHaveBeenCalled();
  });

  it('creates a duty', async () => {
    const user = userEvent.setup();

    renderApp();

    await screen.findByText('No duties yet');
    await user.type(screen.getByRole('textbox', { name: /new duty name/i }), 'Write README');
    await user.click(screen.getByRole('button', { name: /add duty/i }));

    expect(mockedCreateDuty).toHaveBeenCalledWith({ name: 'Write README' });
    expect(await screen.findByText('Write README')).toBeInTheDocument();
  });

  it('updates a duty', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Old name' }];

    renderApp();

    await screen.findByText('Old name');
    await user.click(screen.getByRole('button', { name: /edit old name/i }));

    const dialog = await screen.findByRole('dialog', { name: /edit duty/i });
    const input = within(dialog).getByRole('textbox', { name: /duty name/i });
    await user.clear(input);
    await user.type(input, 'New name');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockedUpdateDuty).toHaveBeenCalledWith('1', { name: 'New name' }));
    expect(await screen.findByText('New name')).toBeInTheDocument();
  });

  it('validates the edit form', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Old name' }];

    renderApp();

    await screen.findByText('Old name');
    await user.click(screen.getByRole('button', { name: /edit old name/i }));

    const dialog = await screen.findByRole('dialog', { name: /edit duty/i });
    const input = within(dialog).getByRole('textbox', { name: /duty name/i });
    await user.clear(input);
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    expect(await within(dialog).findByText('Duty name is required.')).toBeInTheDocument();
    expect(mockedUpdateDuty).not.toHaveBeenCalled();
  });

  it('deletes a duty', async () => {
    const user = userEvent.setup();
    dutiesStore = [{ id: '1', name: 'Remove me' }];

    renderApp();

    await screen.findByText('Remove me');
    await user.click(screen.getByRole('button', { name: /delete remove me/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mockedDeleteDuty).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(screen.queryByText('Remove me')).not.toBeInTheDocument());
  });

  it('loads more duties when the table scroll reaches the bottom', async () => {
    dutiesStore = Array.from({ length: 55 }, (_, index) => ({
      id: String(index + 1),
      name: `Duty ${index + 1}`
    }));

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
    await waitFor(() => expect(screen.getAllByText('55 of 55 loaded')).toHaveLength(2));
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
