import { act, renderHook } from '@testing-library/react';
import useHistoryFilters from './useHistoryFilters';

describe('useHistoryFilters', () => {
  it('builds analysis query from applied search and filters', () => {
    const { result } = renderHook(() => useHistoryFilters());

    act(() => {
      result.current.setSearchInput('Payment Service');
    });

    act(() => {
      result.current.applySearch({ preventDefault: vi.fn() });
      result.current.updateRiskFilter('High');
      result.current.updateStrideFilter('Tampering');
      result.current.updateProjectFilter('7');
      result.current.updateDateFrom('2026-01-01');
      result.current.updateDateTo('2026-01-31');
      result.current.updatePageSize('50');
    });

    expect(result.current.analysesQuery).toEqual({
      skip: 0,
      limit: 50,
      q: 'Payment Service',
      risk_level: 'High',
      stride_category: 'Tampering',
      project_id: 7,
      date_from: '2026-01-01',
      date_to: '2026-01-31',
    });
    expect(result.current.hasFiltersApplied).toBe(true);
  });

  it('resets filters back to defaults', () => {
    const { result } = renderHook(() => useHistoryFilters());

    act(() => {
      result.current.setSearchInput('Search');
      result.current.applySearch({ preventDefault: vi.fn() });
      result.current.updateRiskFilter('High');
      result.current.resetFilters();
    });

    expect(result.current.analysesQuery).toEqual({
      skip: 0,
      limit: 20,
      q: '',
      risk_level: '',
      stride_category: '',
      project_id: '',
      date_from: '',
      date_to: '',
    });
    expect(result.current.hasFiltersApplied).toBe(false);
  });
});
