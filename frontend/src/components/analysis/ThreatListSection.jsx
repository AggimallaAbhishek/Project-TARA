import { useMemo, useState } from 'react';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';

import ThreatCard from '../ThreatCard';

const ALL_OPTION = 'all';
const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
const REMEDIATION_STATUS_OPTIONS = ['Open', 'In Progress', 'Mitigated'];
const STRIDE_CATEGORIES = [
  'Spoofing',
  'Tampering',
  'Repudiation',
  'Information Disclosure',
  'Denial of Service',
  'Elevation of Privilege',
];

function getThreatKey(threat) {
  return String(threat.id);
}

function getDefaultStatus(statuses, threat) {
  return statuses[getThreatKey(threat)] || 'Open';
}

function matchesSearch(threat, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    threat.name,
    threat.description,
    threat.affected_component,
    threat.mitigation,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

export default function ThreatListSection({ threats }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState(ALL_OPTION);
  const [strideFilter, setStrideFilter] = useState(ALL_OPTION);
  const [statusFilter, setStatusFilter] = useState(ALL_OPTION);
  const [expandedThreatIds, setExpandedThreatIds] = useState(() => new Set());
  const [remediationStatuses, setRemediationStatuses] = useState({});

  const filteredThreats = useMemo(
    () => threats.filter((threat) => {
      const status = getDefaultStatus(remediationStatuses, threat);
      return matchesSearch(threat, searchQuery)
        && (riskFilter === ALL_OPTION || threat.risk_level === riskFilter)
        && (strideFilter === ALL_OPTION || threat.stride_category === strideFilter)
        && (statusFilter === ALL_OPTION || status === statusFilter);
    }),
    [remediationStatuses, riskFilter, searchQuery, statusFilter, strideFilter, threats],
  );

  const handleExpandAll = () => {
    setExpandedThreatIds(new Set(filteredThreats.map((threat) => getThreatKey(threat))));
  };

  const handleCollapseAll = () => {
    setExpandedThreatIds(new Set());
  };

  const handleToggleThreat = (threatId, expanded) => {
    setExpandedThreatIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (expanded) {
        nextIds.add(String(threatId));
      } else {
        nextIds.delete(String(threatId));
      }
      return nextIds;
    });
  };

  const handleStatusChange = (threatId, status) => {
    setRemediationStatuses((currentStatuses) => ({
      ...currentStatuses,
      [String(threatId)]: status,
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-cyber-cyan" />
          Identified Threats ({filteredThreats.length}/{threats.length})
        </h2>
      </div>

      <div className="ui-filter-bar mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Filter className="h-4 w-4 text-cyber-cyan" />
          Threat triage controls
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <label htmlFor="threat-search" className="block text-xs text-text-secondary mb-1">
              Search threats
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="threat-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, component, or mitigation"
                className="input-dark pl-9"
              />
            </div>
          </div>

          <div>
            <label htmlFor="threat-risk-filter" className="block text-xs text-text-secondary mb-1">
              Risk
            </label>
            <select
              id="threat-risk-filter"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="input-dark"
            >
              <option value={ALL_OPTION}>All risks</option>
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="threat-stride-filter" className="block text-xs text-text-secondary mb-1">
              STRIDE
            </label>
            <select
              id="threat-stride-filter"
              value={strideFilter}
              onChange={(event) => setStrideFilter(event.target.value)}
              className="input-dark"
            >
              <option value={ALL_OPTION}>All categories</option>
              {STRIDE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="threat-status-filter" className="block text-xs text-text-secondary mb-1">
              Status
            </label>
            <select
              id="threat-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input-dark"
            >
              <option value={ALL_OPTION}>All statuses</option>
              {REMEDIATION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            disabled={filteredThreats.length === 0}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-4 w-4" />
            Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            disabled={expandedThreatIds.size === 0}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronUp className="h-4 w-4" />
            Collapse All
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredThreats.length === 0 ? (
          <div className="ui-empty-state p-8">
            <p className="text-text-secondary">No threats match the current filters.</p>
          </div>
        ) : (
          filteredThreats.map((threat, index) => (
            <ThreatCard
              key={threat.id}
              threat={threat}
              index={index}
              isExpanded={expandedThreatIds.has(getThreatKey(threat))}
              onToggleExpanded={(expanded) => handleToggleThreat(threat.id, expanded)}
              remediationStatus={getDefaultStatus(remediationStatuses, threat)}
              onRemediationStatusChange={(status) => handleStatusChange(threat.id, status)}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
