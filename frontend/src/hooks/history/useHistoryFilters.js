import { useMemo, useState } from 'react';

export default function useHistoryFilters() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [strideFilter, setStrideFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);

  const analysesQuery = useMemo(() => ({
    skip,
    limit,
    q: searchQuery,
    risk_level: riskFilter === 'all' ? '' : riskFilter,
    stride_category: strideFilter === 'all' ? '' : strideFilter,
    project_id: projectFilter === 'all' ? '' : Number(projectFilter),
    date_from: dateFrom,
    date_to: dateTo,
  }), [dateFrom, dateTo, limit, projectFilter, riskFilter, searchQuery, skip, strideFilter]);

  const hasFiltersApplied = useMemo(() => (
    Boolean(searchQuery)
    || riskFilter !== 'all'
    || strideFilter !== 'all'
    || projectFilter !== 'all'
    || Boolean(dateFrom)
    || Boolean(dateTo)
  ), [dateFrom, dateTo, projectFilter, riskFilter, searchQuery, strideFilter]);

  const applySearch = (event) => {
    event.preventDefault();
    setSkip(0);
    setSearchQuery(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setRiskFilter('all');
    setStrideFilter('all');
    setProjectFilter('all');
    setDateFrom('');
    setDateTo('');
    setSkip(0);
  };

  const updateRiskFilter = (value) => {
    setRiskFilter(value);
    setSkip(0);
  };

  const updateStrideFilter = (value) => {
    setStrideFilter(value);
    setSkip(0);
  };

  const updateProjectFilter = (value) => {
    setProjectFilter(value);
    setSkip(0);
  };

  const updateDateFrom = (value) => {
    setDateFrom(value);
    setSkip(0);
  };

  const updateDateTo = (value) => {
    setDateTo(value);
    setSkip(0);
  };

  const updatePageSize = (value) => {
    setLimit(Number(value));
    setSkip(0);
  };

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    riskFilter,
    strideFilter,
    projectFilter,
    dateFrom,
    dateTo,
    skip,
    setSkip,
    limit,
    analysesQuery,
    hasFiltersApplied,
    applySearch,
    resetFilters,
    updateRiskFilter,
    updateStrideFilter,
    updateProjectFilter,
    updateDateFrom,
    updateDateTo,
    updatePageSize,
  };
}
