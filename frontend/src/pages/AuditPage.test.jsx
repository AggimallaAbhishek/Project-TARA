import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import AuditPage from './AuditPage';
import { getAuditLogs } from '../services/api';

vi.mock('../services/api', () => ({
  getAuditLogs: vi.fn(),
}));

function renderAuditPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AuditPage', () => {
  beforeEach(() => {
    getAuditLogs.mockResolvedValue([
      {
        id: 1,
        user_id: 1,
        analysis_id: 42,
        project_id: 7,
        action: 'analysis_created',
        event_metadata: { title: 'Banking v2' },
        created_at: '2026-01-02T10:00:00Z',
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders audit log entries', async () => {
    renderAuditPage();

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenCalledWith({
        action: 'all',
        analysis_id: '',
        project_id: '',
        skip: 0,
        limit: 50,
      });
    });

    expect(await screen.findByRole('heading', { name: 'Audit Logs' })).toBeInTheDocument();
    expect(screen.getAllByText('Analysis created').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Project #7' })).toHaveAttribute('href', '/projects/7');
    expect(screen.getByRole('link', { name: 'Analysis #42' })).toHaveAttribute('href', '/analysis/42');
  });

  it('applies selected filters and resets paging', async () => {
    renderAuditPage();
    await screen.findByRole('heading', { name: 'Audit Logs' });

    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'project_updated' } });
    fireEvent.change(screen.getByLabelText('Analysis ID'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Project ID'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith({
        action: 'project_updated',
        analysis_id: '42',
        project_id: '7',
        skip: 0,
        limit: 50,
      });
    });
  });

  it('supports next-page pagination', async () => {
    getAuditLogs.mockResolvedValueOnce(
      Array.from({ length: 50 }, (_, index) => ({
        id: index + 1,
        user_id: 1,
        analysis_id: 40 + index,
        project_id: 7,
        action: 'analysis_created',
        event_metadata: { title: `Entry ${index + 1}` },
        created_at: '2026-01-02T10:00:00Z',
      })),
    );

    renderAuditPage();
    await screen.findByRole('heading', { name: 'Audit Logs' });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith({
        action: 'all',
        analysis_id: '',
        project_id: '',
        skip: 50,
        limit: 50,
      });
    });
  });

  it('shows empty state when no audit logs exist', async () => {
    getAuditLogs.mockResolvedValueOnce([]);
    renderAuditPage();

    expect(await screen.findByText('No audit events found')).toBeInTheDocument();
  });

  it('shows normalized backend error state', async () => {
    getAuditLogs.mockRejectedValueOnce({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      config: { url: '/audit/logs' },
    });

    renderAuditPage();

    expect(
      await screen.findByText(/Cannot reach the backend service/i),
    ).toBeInTheDocument();
  });
});
