import { useState } from 'react';
import {
  downloadAnalysisDiagramPng,
  getAnalysisDiagramSvg,
} from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { useAbortableEffect } from './useAbortableEffect';

/**
 * Encapsulates all diagram-related state and handlers for an analysis page.
 *
 * Previously, AnalysisPage held 7 diagram state variables and 5 handler
 * functions that were prop-drilled down into AnalysisHeaderCard through 14
 * separate props.  This hook reduces that to a single `diagram` object.
 *
 * @param {string|number} id  Analysis ID from the route params.
 * @param {boolean} hasDiagram  Whether the analysis has an associated diagram.
 * @returns {{ svgDataUrl, loading, error, actionError, activeAction,
 *             isCodeExpanded, handlers }}
 */
export function useDiagramActions(id, hasDiagram) {
  const [svgDataUrl, setSvgDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);

  // Fetch SVG whenever the analysis (or its diagram flag) changes.
  useAbortableEffect(
    (isMounted) => {
      if (!hasDiagram) {
        setSvgDataUrl('');
        setError(null);
        setActionError(null);
        setActiveAction(null);
        setLoading(false);
        return;
      }

      const fetchSvg = async () => {
        setLoading(true);
        setError(null);
        try {
          const svgContent = await getAnalysisDiagramSvg(id);
          if (!isMounted()) return;
          setSvgDataUrl(_svgToDataUrl(svgContent));
        } catch (err) {
          if (!isMounted()) return;
          setSvgDataUrl('');
          setError(
            getApiErrorMessage(err, {
              fallbackMessage: 'Failed to render UML diagram',
              operation: 'analysis.diagram_render',
            }),
          );
        } finally {
          if (isMounted()) setLoading(false);
        }
      };

      fetchSvg();
    },
    [id, hasDiagram],
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const _beginAction = (type) => {
    setActionError(null);
    setActiveAction(type);
  };

  const _endAction = () => setActiveAction(null);

  const _parseFilenameFromHeader = (contentDisposition) => {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) return decodeURIComponent(utf8Match[1]);
    const standardMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return standardMatch ? standardMatch[1] : null;
  };

  const _buildSafeDownloadName = (extension, title) => {
    const normalizedTitle = (title || `analysis-${id}`)
      .trim()
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return `${normalizedTitle || `analysis-${id}`}-${id}.${extension}`;
  };

  const _downloadBlob = (blob, filename) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  // ── Public handlers ─────────────────────────────────────────────────────────

  const handleRetryRender = async () => {
    setLoading(true);
    setError(null);
    try {
      const svgContent = await getAnalysisDiagramSvg(id);
      setSvgDataUrl(_svgToDataUrl(svgContent));
    } catch (retryError) {
      setError(
        getApiErrorMessage(retryError, {
          fallbackMessage: 'Failed to render UML diagram',
          operation: 'analysis.diagram_render_retry',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSvg = async (title) => {
    if (activeAction || !hasDiagram) return;
    _beginAction('downloadSvg');
    try {
      const svgContent = await getAnalysisDiagramSvg(id);
      _downloadBlob(
        new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' }),
        _buildSafeDownloadName('svg', title),
      );
    } catch (err) {
      setActionError(
        getApiErrorMessage(err, {
          fallbackMessage: 'Failed to download SVG diagram',
          operation: 'analysis.diagram_svg_download',
        }),
      );
    } finally {
      _endAction();
    }
  };

  const handleDownloadPng = async (title) => {
    if (activeAction || !hasDiagram) return;
    _beginAction('downloadPng');
    try {
      const response = await downloadAnalysisDiagramPng(id);
      const fileName =
        _parseFilenameFromHeader(response.headers?.['content-disposition']) ||
        _buildSafeDownloadName('png', title);
      _downloadBlob(response.data, fileName);
    } catch (err) {
      setActionError(
        getApiErrorMessage(err, {
          fallbackMessage: 'Failed to download PNG diagram',
          operation: 'analysis.diagram_png_download',
        }),
      );
    } finally {
      _endAction();
    }
  };

  const handleRefreshCache = async () => {
    if (activeAction || !hasDiagram) return;
    _beginAction('refreshCache');
    setLoading(true);
    setError(null);
    try {
      const svgContent = await getAnalysisDiagramSvg(id, { refresh: true });
      setSvgDataUrl(_svgToDataUrl(svgContent));
    } catch (err) {
      const msg = getApiErrorMessage(err, {
        fallbackMessage: 'Failed to refresh diagram render cache',
        operation: 'analysis.diagram_refresh',
      });
      setError(msg);
      setActionError(msg);
    } finally {
      setLoading(false);
      _endAction();
    }
  };

  const handleToggleCode = () => setIsCodeExpanded((v) => !v);

  return {
    svgDataUrl,
    loading,
    error,
    actionError,
    activeAction,
    isCodeExpanded,
    handlers: {
      onRetryRender: handleRetryRender,
      onDownloadSvg: handleDownloadSvg,
      onDownloadPng: handleDownloadPng,
      onRefreshCache: handleRefreshCache,
      onToggleCode: handleToggleCode,
    },
  };
}

// ── Utility ────────────────────────────────────────────────────────────────────

/**
 * Convert an SVG string to a base64 data URL without the deprecated
 * `unescape()` function (F-08 fix).
 */
function _svgToDataUrl(svgText) {
  const bytes = new TextEncoder().encode(svgText);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return `data:image/svg+xml;base64,${window.btoa(binary)}`;
}
