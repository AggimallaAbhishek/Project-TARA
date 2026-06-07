import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data: projectsData } = useQuery({
    queryKey: ['projects', { limit: 100 }],
    queryFn: () => getProjects({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const projects = projectsData?.items || [];

  const {
    data: analysesData,
    isLoading: loading,
    error: loadError,
    refetch: refreshAnalyses,
  } = useQuery({
    queryKey: ['analyses', analysesQuery],
    queryFn: () => getAnalyses(analysesQuery),
    keepPreviousData: true,
  });

  const analyses = analysesData?.items || [];
  const total = analysesData?.total || 0;
  const hasMore = Boolean(analysesData?.has_more);
  const error = loadError
    ? getApiErrorMessage(loadError, {
        fallbackMessage: 'Failed to load analyses',
        operation: 'history.load',
      })
    : null;

  const deleteMutation = useMutation({
    mutationFn: (analysisId) => deleteAnalysis(analysisId),
    onSuccess: () => {
      setDeleteConfirm(null);
      setActionError(null);
      if (analyses.length === 1 && skip > 0) {
        setSkip(Math.max(0, skip - limit));
      } else {
        queryClient.invalidateQueries({ queryKey: ['analyses'] });
      }
    },
    onError: (err) => {
      console.error('Failed to delete analysis:', err);
      setActionError(
        getApiErrorMessage(err, {
          fallbackMessage: 'Failed to delete analysis',
          operation: 'history.delete',
        })
      );
    },
  });

  const requestDelete = (analysis) => {
    setDeleteConfirm(analysis);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const confirmDelete = async (analysisId) => {
    deleteMutation.mutate(analysisId);
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
