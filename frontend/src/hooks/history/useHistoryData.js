import { useEffect, useRef, useState } from 'react';

export default function useHistoryData({
  analysesQuery,
  skip,
  limit,
  setSkip,
  getAnalyses,
  getProjects,
  deleteAnalysis,
  getApiErrorMessage,
}) {
  const [analyses, setAnalyses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        const data = await getProjects({ limit: 100 });
        if (isMounted) {
          setProjects(data.items || []);
        }
      } catch (projectLoadError) {
        console.error('Failed to load project filter options:', projectLoadError);
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [getProjects]);

  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        if (!hasLoadedOnceRef.current) {
          setLoading(true);
        }

        const data = await getAnalyses(analysesQuery);
        setAnalyses(data.items || []);
        setTotal(data.total || 0);
        setHasMore(Boolean(data.has_more));
        setError(null);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, {
          fallbackMessage: 'Failed to load analyses',
          operation: 'history.load',
        }));
      } finally {
        setLoading(false);
        hasLoadedOnceRef.current = true;
      }
    };

    loadAnalyses();
  }, [analysesQuery, getAnalyses, getApiErrorMessage, refreshKey]);

  const refreshAnalyses = () => {
    setRefreshKey((value) => value + 1);
  };

  const requestDelete = (analysis) => {
    setDeleteConfirm(analysis);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const confirmDelete = async (analysisId) => {
    try {
      await deleteAnalysis(analysisId);
      setDeleteConfirm(null);
      setActionError(null);

      if (analyses.length === 1 && skip > 0) {
        setSkip(Math.max(0, skip - limit));
      } else {
        refreshAnalyses();
      }
    } catch (deleteError) {
      console.error('Failed to delete analysis:', deleteError);
      setActionError(getApiErrorMessage(deleteError, {
        fallbackMessage: 'Failed to delete analysis',
        operation: 'history.delete',
      }));
    }
  };

  return {
    analyses,
    projects,
    total,
    hasMore,
    loading,
    error,
    actionError,
    deleteConfirm,
    requestDelete,
    cancelDelete,
    confirmDelete,
    refreshAnalyses,
  };
}
