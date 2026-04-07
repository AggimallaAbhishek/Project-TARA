import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ArrowLeft, Clock, Shield, AlertTriangle, Download,
  TrendingUp, FileText
} from 'lucide-react';
import { downloadAnalysisPdf, getAnalysis } from '../services/api';
import ThreatCard from '../components/ThreatCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AnalysisPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

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

  const parseFilenameFromHeader = (contentDisposition) => {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
      return decodeURIComponent(utf8Match[1]);
    }
    const standardMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return standardMatch ? standardMatch[1] : null;
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setPdfError(null);
    setIsDownloadingPdf(true);
    try {
      const response = await downloadAnalysisPdf(id);
      const filename =
        parseFilenameFromHeader(response.headers?.['content-disposition']) || `analysis-${id}.pdf`;
      const blobUrl = window.URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error('Failed to download PDF report:', downloadError);
      setPdfError(downloadError.response?.data?.detail || 'Failed to download PDF report');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading analysis..." />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-risk-critical text-lg mb-4">{error || 'Analysis not found'}</div>
        <Link to="/" className="text-cyber-cyan hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate chart data
  const riskDistribution = [
    { name: 'Critical', value: analysis.threats.filter(t => t.risk_level === 'Critical').length, color: '#FF4D4D' },
    { name: 'High', value: analysis.threats.filter(t => t.risk_level === 'High').length, color: '#FF6B6B' },
    { name: 'Medium', value: analysis.threats.filter(t => t.risk_level === 'Medium').length, color: '#FFA500' },
    { name: 'Low', value: analysis.threats.filter(t => t.risk_level === 'Low').length, color: '#00FF94' },
  ].filter(d => d.value > 0);

  const strideDistribution = [
    { name: 'Spoofing', count: analysis.threats.filter(t => t.stride_category === 'Spoofing').length },
    { name: 'Tampering', count: analysis.threats.filter(t => t.stride_category === 'Tampering').length },
    { name: 'Repudiation', count: analysis.threats.filter(t => t.stride_category === 'Repudiation').length },
    { name: 'Info Disclosure', count: analysis.threats.filter(t => t.stride_category === 'Information Disclosure').length },
    { name: 'DoS', count: analysis.threats.filter(t => t.stride_category === 'Denial of Service').length },
    { name: 'Elevation', count: analysis.threats.filter(t => t.stride_category === 'Elevation of Privilege').length },
  ].filter(d => d.count > 0);

  const highRiskCount = analysis.threats.filter(t => ['Critical', 'High'].includes(t.risk_level)).length;
  const sortedThreats = [...analysis.threats].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-text-secondary hover:text-cyber-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark p-6 mb-6"
      >
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isDownloadingPdf ? 'Downloading...' : 'Download PDF Report'}
          </button>
        </div>
        {pdfError && (
          <div className="mb-4 p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-sm text-risk-critical">
            {pdfError}
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
              {analysis.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(analysis.created_at).toLocaleString()}
              </span>
              {analysis.analysis_time > 0 && (
                <span className="flex items-center gap-1 text-cyber-cyan">
                  <TrendingUp className="w-4 h-4" />
                  Analyzed in {analysis.analysis_time.toFixed(1)}s
                </span>
              )}
            </div>
          </div>
          
          {/* Risk Score */}
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-dark-tertiary rounded-lg">
              <div className="text-3xl font-bold text-cyber-cyan">
                {analysis.total_risk_score.toFixed(1)}
              </div>
              <div className="text-xs text-text-muted">Avg Risk Score</div>
            </div>
            <div className="text-center px-4 py-2 bg-dark-tertiary rounded-lg">
              <div className="text-3xl font-bold text-text-primary">
                {analysis.threats.length}
              </div>
              <div className="text-xs text-text-muted">Threats Found</div>
            </div>
            {highRiskCount > 0 && (
              <div className="text-center px-4 py-2 bg-risk-critical/10 border border-risk-critical/30 rounded-lg">
                <div className="text-3xl font-bold text-risk-critical">
                  {highRiskCount}
                </div>
                <div className="text-xs text-risk-critical">High/Critical</div>
              </div>
            )}
          </div>
        </div>

        {/* System Description */}
        <div className="mt-6 p-4 bg-dark-tertiary rounded-lg">
          <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            System Description
          </h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {analysis.system_description}
          </p>
        </div>
      </motion.div>

      {/* Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-2 gap-6 mb-6"
      >
        {/* Risk Distribution Pie Chart */}
        <div className="card-dark p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cyber-cyan" />
            Risk Distribution
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121826',
                    border: '1px solid #2a3441',
                    borderRadius: '8px',
                    color: '#E6EAF2',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-text-secondary">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STRIDE Bar Chart */}
        <div className="card-dark p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyber-cyan" />
            STRIDE Categories
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strideDistribution} layout="vertical">
                <XAxis type="number" tick={{ fill: '#9AA4B2' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: '#9AA4B2', fontSize: 12 }} 
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121826',
                    border: '1px solid #2a3441',
                    borderRadius: '8px',
                    color: '#E6EAF2',
                  }}
                />
                <Bar dataKey="count" fill="#00F5FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Threats List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-cyber-cyan" />
          Identified Threats ({analysis.threats.length})
        </h2>
        
        <div className="space-y-4">
          {sortedThreats.map((threat, index) => (
            <ThreatCard key={threat.id} threat={threat} index={index} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
