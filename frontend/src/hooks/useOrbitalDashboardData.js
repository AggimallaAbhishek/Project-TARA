import { useEffect, useMemo, useState } from 'react';
import { getAnalyses, getAuditLogs, getProjects } from '../services/api';
import { buildDashboardViewModel } from '../components/orbital/orbitalMappers';
import { getApiErrorMessage } from '../services/apiError';

const EMPTY_DASHBOARD_MODEL = {
  operations: [],
  feed: [],
  entities: [],
  hero: {
    operationCount: 0,
    feedCount: 0,
    entityCount: 0,
    criticalCount: 0,
    threatLevel: 'TEAL',
    averageProgress: 0,
  },
};

function createErrorState() {
  return {
    analyses: '',
    audit: '',
    projects: '',
  };
}

export default function useOrbitalDashboardData() {
  const [analyses, setAnalyses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(createErrorState);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setLoading(true);

      const [analysesResult, auditResult, projectsResult] = await Promise.allSettled([
        getAnalyses({ skip: 0, limit: 20 }),
        getAuditLogs({ skip: 0, limit: 20 }),
        getProjects({ skip: 0, limit: 8 }),
      ]);

      if (!isMounted) return;

      const nextErrors = createErrorState();

      if (analysesResult.status === 'fulfilled') {
        setAnalyses(analysesResult.value.items || []);
      } else {
        setAnalyses([]);
        nextErrors.analyses = getApiErrorMessage(analysesResult.reason, {
          fallbackMessage: 'Failed to load operations telemetry.',
          operation: 'orbital.operations',
        });
      }

      if (auditResult.status === 'fulfilled') {
        setAuditLogs(auditResult.value || []);
      } else {
        setAuditLogs([]);
        nextErrors.audit = getApiErrorMessage(auditResult.reason, {
          fallbackMessage: 'Failed to load signal feed telemetry.',
          operation: 'orbital.audit_feed',
        });
      }

      if (projectsResult.status === 'fulfilled') {
        setProjects(projectsResult.value.items || []);
      } else {
        setProjects([]);
        nextErrors.projects = getApiErrorMessage(projectsResult.reason, {
          fallbackMessage: 'Failed to load entity telemetry.',
          operation: 'orbital.entities',
        });
      }

      if (import.meta.env.DEV) {
        console.debug('orbital.dashboard.data.loaded', {
          analysesCount: analysesResult.status === 'fulfilled' ? (analysesResult.value.items || []).length : 0,
          auditCount: auditResult.status === 'fulfilled' ? (auditResult.value || []).length : 0,
          projectCount: projectsResult.status === 'fulfilled' ? (projectsResult.value.items || []).length : 0,
          errors: nextErrors,
        });
      }

      setErrors(nextErrors);
      setLoading(false);
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const dashboard = useMemo(() => {
    if (analyses.length === 0 && auditLogs.length === 0 && projects.length === 0) {
      return EMPTY_DASHBOARD_MODEL;
    }

    return buildDashboardViewModel({
      analyses,
      auditLogs,
      projects,
    });
  }, [analyses, auditLogs, projects]);

  return {
    dashboard,
    loading,
    errors,
  };
}
