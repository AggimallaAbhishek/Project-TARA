import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import {
  ArrowLeft,
} from 'lucide-react';
import {
  downloadAnalysisDiagramPng,
  downloadAnalysisPdf,
  getAnalysis,
  getAnalysisDiagramSvg,
  getAnalysisSummary,
  getAnalysisVersionComparison,
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
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const [summaryWarning, setSummaryWarning] = useState('');
  const [diagramSvgDataUrl, setDiagramSvgDataUrl] = useState('');
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState(null);
  const [diagramActionError, setDiagramActionError] = useState(null);
  const [activeDiagramAction, setActiveDiagramAction] = useState(null);
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
      setDiagramActionError(null);
      setActiveDiagramAction(null);
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
    const fetchAnalysisSummary = async () => {
      try {
        const data = await getAnalysisSummary(id);
        if (!isMounted) return;
        setAnalysisSummary(data);
        setSummaryWarning('');
        if (import.meta.env.DEV) {
          console.debug('analysis.summary.fetch.success', {
            analysisId: id,
            totalThreats: data?.total_threats,
          });
        }
      } catch (summaryError) {
        if (!isMounted) return;
        setAnalysisSummary(null);
        setSummaryWarning(getApiErrorMessage(summaryError, {
          fallbackMessage: 'Could not load server summary metrics. Showing locally computed metrics.',
          operation: 'analysis.summary',
        }));
        if (import.meta.env.DEV) {
          console.debug('analysis.summary.fetch.failed', {
            analysisId: id,
            message: summaryError?.message || 'unknown',
          });
          console.debug('analysis.summary.fallback.active', { analysisId: id });
        }
      }
    };

    fetchAnalysisSummary();
    return () => {
      isMounted = false;
    };
  }, [id]);

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

  const buildSafeDownloadName = (extension) => {
    const normalizedTitle = (analysis?.title || `analysis-${id}`)
      .trim()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const baseName = normalizedTitle || `analysis-${id}`;
    return `${baseName}-${id}.${extension}`;
  };

  const downloadBlob = (blob, filename) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setPdfError(null);
    setIsDownloadingPdf(true);
    try {
      const response = await downloadAnalysisPdf(id);
      const filename =
        parseFilenameFromHeader(response.headers?.['content-disposition']) || `analysis-${id}.pdf`;
      downloadBlob(response.data, filename);
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

  const riskDistribution = analysisSummary
    ? buildRiskDistributionFromSummary(analysisSummary)
    : buildRiskDistribution(analysis.threats);
  const strideDistribution = analysisSummary
    ? buildStrideDistributionFromSummary(analysisSummary)
    : buildStrideDistribution(analysis.threats);
  const highRiskCount = analysisSummary
    ? Number(analysisSummary.high_count || 0) + Number(analysisSummary.critical_count || 0)
    : getHighRiskCount(analysis.threats);
  const totalThreatCount = analysisSummary
    ? Number(analysisSummary.total_threats || 0)
    : analysis.threats.length;
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

  const beginDiagramAction = (actionType) => {
    setDiagramActionError(null);
    setActiveDiagramAction(actionType);
  };

  const endDiagramAction = () => {
    setActiveDiagramAction(null);
  };

  const handleDownloadDiagramSvg = async () => {
    if (activeDiagramAction || !analysis?.has_diagram) return;
    beginDiagramAction('downloadSvg');
    try {
      const svgContent = await getAnalysisDiagramSvg(id);
      const fileName = buildSafeDownloadName('svg');
      downloadBlob(new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' }), fileName);
    } catch (actionError) {
      setDiagramActionError(getApiErrorMessage(actionError, {
        fallbackMessage: 'Failed to download SVG diagram',
        operation: 'analysis.diagram_svg_download',
      }));
    } finally {
      endDiagramAction();
    }
  };

  const handleDownloadDiagramPng = async () => {
    if (activeDiagramAction || !analysis?.has_diagram) return;
    beginDiagramAction('downloadPng');
    try {
      const response = await downloadAnalysisDiagramPng(id);
      const fileName =
        parseFilenameFromHeader(response.headers?.['content-disposition']) || buildSafeDownloadName('png');
      downloadBlob(response.data, fileName);
    } catch (actionError) {
      setDiagramActionError(getApiErrorMessage(actionError, {
        fallbackMessage: 'Failed to download PNG diagram',
        operation: 'analysis.diagram_png_download',
      }));
    } finally {
      endDiagramAction();
    }
  };

  const handleRefreshDiagramCache = async () => {
    if (activeDiagramAction || !analysis?.has_diagram) return;
    beginDiagramAction('refreshCache');
    setDiagramLoading(true);
    setDiagramError(null);
    try {
      const svgContent = await getAnalysisDiagramSvg(id, { refresh: true });
      setDiagramSvgDataUrl(svgToDataUrl(svgContent));
    } catch (actionError) {
      const normalizedMessage = getApiErrorMessage(actionError, {
        fallbackMessage: 'Failed to refresh diagram render cache',
        operation: 'analysis.diagram_refresh',
      });
      setDiagramError(normalizedMessage);
      setDiagramActionError(normalizedMessage);
    } finally {
      setDiagramLoading(false);
      endDiagramAction();
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
        totalThreatCount={totalThreatCount}
        highRiskCount={highRiskCount}
        isDownloadingPdf={isDownloadingPdf}
        pdfError={pdfError}
        onDownloadPdf={handleDownloadPdf}
        diagramLoading={diagramLoading}
        diagramError={diagramError}
        diagramSvgDataUrl={diagramSvgDataUrl}
        isDiagramCodeExpanded={isDiagramCodeExpanded}
        diagramActionError={diagramActionError}
        activeDiagramAction={activeDiagramAction}
        onToggleDiagramCode={() => setIsDiagramCodeExpanded((value) => !value)}
        onRetryDiagramRender={handleRetryDiagramRender}
        onDownloadDiagramSvg={handleDownloadDiagramSvg}
        onDownloadDiagramPng={handleDownloadDiagramPng}
        onRefreshDiagramCache={handleRefreshDiagramCache}
      />

      {summaryWarning && (
        <div className="mb-6 p-3 bg-risk-medium/10 border border-risk-medium/30 rounded-lg text-sm text-risk-medium">
          {summaryWarning}
        </div>
      )}

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
