import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import {
  ArrowLeft,
} from 'lucide-react';
import {
  downloadAnalysisPdf,
  getAnalysis,
  getAnalysisDiagramSvg,
  getAnalysisVersionComparison,
} from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import LoadingSpinner from '../components/LoadingSpinner';
import AnalysisHeaderCard from '../components/analysis/AnalysisHeaderCard';
import VersionComparisonPanel from '../components/analysis/VersionComparisonPanel';
import ThreatListSection from '../components/analysis/ThreatListSection';
import {
  buildRiskDistribution,
  buildStrideDistribution,
  getHighRiskCount,
  sortThreatsByRisk,
} from '../components/analysis/analysisMetrics';

const AnalysisCharts = lazy(() => import('../components/analysis/AnalysisCharts'));

function svgToDataUrl(svgText) {
  const encoded = window.btoa(unescape(encodeURIComponent(svgText)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export default function AnalysisPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [versionComparison, setVersionComparison] = useState(null);
  const [versionComparisonLoading, setVersionComparisonLoading] = useState(true);
  const [versionComparisonError, setVersionComparisonError] = useState(null);
  const [diagramSvgDataUrl, setDiagramSvgDataUrl] = useState('');
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState(null);
  const [isDiagramCodeExpanded, setIsDiagramCodeExpanded] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const data = await getAnalysis(id);
        setAnalysis(data);
      } catch (err) {
        setError(getApiErrorMessage(err, {
          fallbackMessage: 'Failed to load analysis',
          operation: 'analysis.fetch',
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    if (!analysis?.has_diagram) {
      setDiagramSvgDataUrl('');
      setDiagramError(null);
      setDiagramLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const fetchDiagramSvg = async () => {
      setDiagramLoading(true);
      setDiagramError(null);
      try {
        const svgContent = await getAnalysisDiagramSvg(id);
        if (!isMounted) return;
        setDiagramSvgDataUrl(svgToDataUrl(svgContent));
      } catch (err) {
        if (!isMounted) return;
        setDiagramSvgDataUrl('');
        setDiagramError(getApiErrorMessage(err, {
          fallbackMessage: 'Failed to render UML diagram',
          operation: 'analysis.diagram_render',
        }));
      } finally {
        if (isMounted) {
          setDiagramLoading(false);
        }
      }
    };

    fetchDiagramSvg();
    return () => {
      isMounted = false;
    };
  }, [analysis?.has_diagram, id]);

  useEffect(() => {
    let isMounted = true;
    const fetchVersionComparison = async () => {
      setVersionComparisonLoading(true);
      setVersionComparisonError(null);
      try {
        const data = await getAnalysisVersionComparison(id);
        if (isMounted) {
          setVersionComparison(data);
        }
      } catch (err) {
        if (isMounted) {
          setVersionComparisonError(getApiErrorMessage(err, {
            fallbackMessage: 'Failed to load version comparison',
            operation: 'analysis.version_comparison',
          }));
          setVersionComparison(null);
        }
      } finally {
        if (isMounted) {
          setVersionComparisonLoading(false);
        }
      }
    };

    fetchVersionComparison();
    return () => {
      isMounted = false;
    };
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
      setPdfError(getApiErrorMessage(downloadError, {
        fallbackMessage: 'Failed to download PDF report',
        operation: 'analysis.pdf_export',
      }));
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

  const riskDistribution = buildRiskDistribution(analysis.threats);
  const strideDistribution = buildStrideDistribution(analysis.threats);
  const highRiskCount = getHighRiskCount(analysis.threats);
  const sortedThreats = sortThreatsByRisk(analysis.threats);

  const handleRetryDiagramRender = async () => {
    setDiagramLoading(true);
    setDiagramError(null);
    try {
      const svgContent = await getAnalysisDiagramSvg(id);
      setDiagramSvgDataUrl(svgToDataUrl(svgContent));
    } catch (retryError) {
      setDiagramError(getApiErrorMessage(retryError, {
        fallbackMessage: 'Failed to render UML diagram',
        operation: 'analysis.diagram_render_retry',
      }));
    } finally {
      setDiagramLoading(false);
    }
  };

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

      <AnalysisHeaderCard
        analysis={analysis}
        highRiskCount={highRiskCount}
        isDownloadingPdf={isDownloadingPdf}
        pdfError={pdfError}
        onDownloadPdf={handleDownloadPdf}
        diagramLoading={diagramLoading}
        diagramError={diagramError}
        diagramSvgDataUrl={diagramSvgDataUrl}
        isDiagramCodeExpanded={isDiagramCodeExpanded}
        onToggleDiagramCode={() => setIsDiagramCodeExpanded((value) => !value)}
        onRetryDiagramRender={handleRetryDiagramRender}
      />

      <VersionComparisonPanel
        loading={versionComparisonLoading}
        error={versionComparisonError}
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
