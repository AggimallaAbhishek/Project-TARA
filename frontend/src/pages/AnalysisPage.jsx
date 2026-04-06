import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAnalysis } from '../services/api';
import ThreatTable from '../components/ThreatTable';
import RiskSummary from '../components/RiskSummary';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AnalysisPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const data = await getAnalysis(id);
        setAnalysis(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  if (loading) {
    return <LoadingSpinner text="Loading analysis..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <Link to="/" className="text-indigo-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">Analysis not found</div>
        <Link to="/" className="text-indigo-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-indigo-600 hover:underline text-sm">
          ← New Analysis
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analysis.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Created: {new Date(analysis.created_at).toLocaleString()}
              {analysis.analysis_time > 0 && (
                <span className="ml-2 text-indigo-600">
                  • Analyzed in {analysis.analysis_time.toFixed(1)}s
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-600">
              {analysis.total_risk_score.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Average Risk Score</div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">System Description</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{analysis.system_description}</p>
        </div>
      </div>

      <RiskSummary threats={analysis.threats} />

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Identified Threats ({analysis.threats.length})
        </h2>
        <ThreatTable threats={analysis.threats} />
      </div>
    </div>
  );
}
