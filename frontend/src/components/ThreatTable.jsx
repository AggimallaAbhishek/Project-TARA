import { useState } from 'react';
import RiskBadge from './RiskBadge';
import StrideBadge from './StrideBadge';

export default function ThreatTable({ threats, showFilters = true }) {
  const [filter, setFilter] = useState('all');
  const [strideFilter, setStrideFilter] = useState('all');

  const filteredThreats = threats.filter((threat) => {
    const riskMatch = filter === 'all' || threat.risk_level.toLowerCase() === filter;
    const strideMatch = strideFilter === 'all' || threat.stride_category === strideFilter;
    return riskMatch && strideMatch;
  });

  const strideCategories = [...new Set(threats.map(t => t.stride_category))];

  return (
    <div>
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Risk Level</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">STRIDE Category</label>
            <select
              value={strideFilter}
              onChange={(e) => setStrideFilter(e.target.value)}
              className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              <option value="all">All Categories</option>
              {strideCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-gray-500">
              Showing {filteredThreats.length} of {threats.length} threats
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Threat
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                STRIDE
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Component
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                L × I
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mitigation
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredThreats.map((threat) => (
              <tr key={threat.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">{threat.name}</div>
                  <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={threat.description}>
                    {threat.description}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StrideBadge category={threat.stride_category} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  {threat.affected_component}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <RiskBadge level={threat.risk_level} score={threat.risk_score} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  {threat.likelihood} × {threat.impact}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-600 max-w-xs truncate" title={threat.mitigation}>
                    {threat.mitigation}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredThreats.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No threats found matching the current filters.
        </div>
      )}
    </div>
  );
}
