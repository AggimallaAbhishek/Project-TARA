import RiskBadge from './RiskBadge';

export default function RiskSummary({ threats }) {
  if (!threats || threats.length === 0) return null;

  const summary = {
    total: threats.length,
    critical: threats.filter(t => t.risk_level === 'Critical').length,
    high: threats.filter(t => t.risk_level === 'High').length,
    medium: threats.filter(t => t.risk_level === 'Medium').length,
    low: threats.filter(t => t.risk_level === 'Low').length,
  };

  const avgScore = (threats.reduce((sum, t) => sum + t.risk_score, 0) / threats.length).toFixed(1);
  const maxScore = Math.max(...threats.map(t => t.risk_score));

  const strideCount = threats.reduce((acc, t) => {
    acc[t.stride_category] = (acc[t.stride_category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Summary</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
          <div className="text-sm text-gray-500">Total Threats</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{summary.critical + summary.high}</div>
          <div className="text-sm text-gray-500">High/Critical</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{avgScore}</div>
          <div className="text-sm text-gray-500">Avg Risk Score</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">{maxScore}</div>
          <div className="text-sm text-gray-500">Max Risk Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">By Risk Level</h4>
          <div className="space-y-2">
            {['Critical', 'High', 'Medium', 'Low'].map(level => {
              const count = summary[level.toLowerCase()];
              const percentage = ((count / summary.total) * 100).toFixed(0);
              return (
                <div key={level} className="flex items-center">
                  <RiskBadge level={level} />
                  <div className="flex-1 mx-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          level === 'Critical' ? 'bg-red-500' :
                          level === 'High' ? 'bg-orange-500' :
                          level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">By STRIDE Category</h4>
          <div className="space-y-1">
            {Object.entries(strideCount).sort((a, b) => b[1] - a[1]).map(([category, count]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-gray-600">{category}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
