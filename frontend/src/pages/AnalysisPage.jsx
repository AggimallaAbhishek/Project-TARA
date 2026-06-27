import { lazy, Suspense, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import {
  ArrowLeft,
} from 'lucide-react';
import {
  downloadAnalysisPdf,
  getAnalysis,
} from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import LoadingSpinner from '../components/LoadingSpinner';
import AnalysisHeaderCard from '../components/analysis/AnalysisHeaderCard';
import VersionComparisonPanel from '../components/analysis/VersionComparisonPanel';
import ThreatListSection from '../components/analysis/ThreatListSection';
import {
  buildRiskDistribution,
  buildRiskDistributionFromSummary,
  buildStrideDistribution,
  buildStrideDistributionFromSummary,
  getHighRiskCount,
  sortThreatsByRisk,
} from '../components/analysis/analysisMetrics';
import { useAbortableEffect } from '../hooks/useAbortableEffect';
import { useDiagramActions } from '../hooks/useDiagramActions';

const AnalysisCharts = lazy(() => import('../components/analysis/AnalysisCharts'));

export default function AnalysisPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // F-06: useAbortableEffect replaces the verbose isMounted + cleanup pattern.
  useAbortableEffect(
    (isMounted) => {
      const fetchAnalysis = async () => {
        try {
          const data = await getAnalysis(id);
          if (!isMounted()) return;
          setAnalysis(data);
        } catch (err) {
          if (!isMounted()) return;
          setError(
            getApiErrorMessage(err, {
              fallbackMessage: 'Failed to load analysis',
              operation: 'analysis.fetch',
            }),
          );
        } finally {
          if (isMounted()) setLoading(false);
        }
      };
      fetchAnalysis();
    },
    [id],
  );

  // F-02: All diagram state + handlers live in this hook.
  // F-08: svgToDataUrl uses TextEncoder (no deprecated unescape).
  const diagram = useDiagramActions(id, analysis?.has_diagram ?? false);

  const parseFilenameFromHeader = (contentDisposition) => {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) return decodeURIComponent(utf8Match[1]);
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
        parseFilenameFromHeader(response.headers?.['content-disposition']) ||
        `analysis-${id}.pdf`;
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
      setPdfError(
        getApiErrorMessage(downloadError, {
          fallbackMessage: 'Failed to download PDF report',
          operation: 'analysis.pdf_export',
        }),
      );
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

  const analysisSummary = analysis.risk_summary || null;
  const versionComparison = analysis.version_comparison || null;
  const threats = analysis.threats || [];
  const riskDistribution = analysisSummary
    ? buildRiskDistributionFromSummary(analysisSummary)
    : buildRiskDistribution(threats);
  const strideDistribution = analysisSummary
    ? buildStrideDistributionFromSummary(analysisSummary)
    : buildStrideDistribution(threats);
  const highRiskCount = analysisSummary
    ? Number(analysisSummary.high_count || 0) + Number(analysisSummary.critical_count || 0)
    : getHighRiskCount(threats);
  const totalThreatCount = analysisSummary
    ? Number(analysisSummary.total_threats || 0)
    : threats.length;
  const sortedThreats = sortThreatsByRisk(threats);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          to={analysis?.project ? `/projects/${analysis.project.id}` : "/"}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-cyber-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {analysis?.project ? `Back to ${analysis.project.name}` : 'Back to Dashboard'}
        </Link>
      </motion.div>

      {/* F-02: diagram prop is a single object instead of 14 individual props */}
      <AnalysisHeaderCard
        analysis={analysis}
        totalThreatCount={totalThreatCount}
        highRiskCount={highRiskCount}
        isDownloadingPdf={isDownloadingPdf}
        pdfError={pdfError}
        onDownloadPdf={handleDownloadPdf}
        diagram={diagram}
      />

      <VersionComparisonPanel
        loading={false}
        error={null}
        versionComparison={versionComparison}
      />

      <Suspense fallback={<LoadingSpinner text="Loading analysis charts..." />}>
        <AnalysisCharts
          riskDistribution={riskDistribution}
          strideDistribution={strideDistribution}
        />
      </Suspense>

      <ThreatListSection threats={sortedThreats} />
    </div>
  );
}
