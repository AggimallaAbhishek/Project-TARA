import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyses, deleteAnalysis } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import RiskBadge from '../components/RiskBadge';

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const data = await getAnalyses();
      setAnalyses(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete analysis "${title}"?`)) return;
    
    try {
      await deleteAnalysis(id);
      setAnalyses(analyses.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete analysis');
    }
  };

  const getRiskBadgeLevel = (score) => {
    if (score >= 16) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return <LoadingSpinner text="Loading history..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
        <Link
          to="/"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
        >
          + New Analysis
        </Link>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 text-5xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
          <p className="text-gray-500 mb-4">
            Start by analyzing your first system architecture
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Analysis
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analysis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      {analysis.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900">{analysis.threat_count}</span>
                    {analysis.high_risk_count > 0 && (
                      <span className="ml-2 text-red-600 text-sm">
                        ({analysis.high_risk_count} high/critical)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RiskBadge 
                      level={getRiskBadgeLevel(analysis.total_risk_score)} 
                      score={analysis.total_risk_score.toFixed(1)} 
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(analysis.id, analysis.title)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
