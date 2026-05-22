import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from './App';
import { ApiClientError, createDuty, deleteDuty, getDuties, updateDuty } from './api/dutiesApi';

jest.mock('./api/dutiesApi', () => {
  class MockApiClientError extends Error {
    public readonly status: number;
    public readonly code: string;
    public readonly requestId?: string;

    public constructor(message: string, status: number, code = 'NETWORK_ERROR', requestId?: string) {
      super(message);
      this.name = 'ApiClientError';
      this.status = status;
      this.code = code;
      this.requestId = requestId;
    }
  }

  return {
    ApiClientError: MockApiClientError,
    getDuties: jest.fn(),
    createDuty: jest.fn(),
    updateDuty: jest.fn(),
    deleteDuty: jest.fn()
  };
});

const mockedGetDuties = jest.mocked(getDuties);
const mockedCreateDuty = jest.mocked(createDuty);
const mockedUpdateDuty = jest.mocked(updateDuty);
const mockedDeleteDuty = jest.mocked(deleteDuty);

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDuties.mockResolvedValue([]);
  });

  it('renders duties returned by the API', async () => {
    mockedGetDuties.mockResolvedValue([{ id: '1', name: 'Plan release' }]);

    render(<App />);

    expect(await screen.findByText('Plan release')).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
  });

  it('validates the create form', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('No duties yet');
    await user.click(screen.getByRole('button', { name: /add duty/i }));

    expect(await screen.findByText('Duty name is required.')).toBeInTheDocument();
    expect(mockedCreateDuty).not.toHaveBeenCalled();
  });

  it('creates a duty', async () => {
    const user = userEvent.setup();
    mockedCreateDuty.mockResolvedValue({ id: '1', name: 'Write README' });

    render(<App />);

    await screen.findByText('No duties yet');
    await user.type(screen.getByRole('textbox', { name: /new duty name/i }), 'Write README');
    await user.click(screen.getByRole('button', { name: /add duty/i }));

    expect(mockedCreateDuty).toHaveBeenCalledWith({ name: 'Write README' });
    expect(await screen.findByText('Write README')).toBeInTheDocument();
  });

  it('updates a duty', async () => {
    const user = userEvent.setup();
    mockedGetDuties.mockResolvedValue([{ id: '1', name: 'Old name' }]);
    mockedUpdateDuty.mockResolvedValue({ id: '1', name: 'New name' });

    render(<App />);

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

  it('deletes a duty', async () => {
    const user = userEvent.setup();
    mockedGetDuties.mockResolvedValue([{ id: '1', name: 'Remove me' }]);
    mockedDeleteDuty.mockResolvedValue(undefined);

    render(<App />);

    await screen.findByText('Remove me');
    await user.click(screen.getByRole('button', { name: /delete remove me/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mockedDeleteDuty).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(screen.queryByText('Remove me')).not.toBeInTheDocument());
  });

  it('shows API errors', async () => {
    mockedGetDuties.mockRejectedValue(new ApiClientError('Backend unavailable', 0));

    render(<App />);

    expect(await screen.findByText('Backend unavailable')).toBeInTheDocument();
  });
});
