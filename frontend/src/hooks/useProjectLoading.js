import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Handles project list loading, retry, and inline create interactions for Home page.
 */
export default function useProjectLoading({
  requestedProjectId,
  getProjects,
  createProject,
  getApiErrorMessage,
}) {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectError, setProjectError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadProjects = useCallback(async ({ reason = 'initial' } = {}) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    if (import.meta.env.DEV) {
      console.debug('projects.load.start', { reason, requestId, requestedProjectId });
    }

    setProjectsLoading(true);
    try {
      const data = await getProjects({ limit: 100 });
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return;
      }

      const nextProjects = data.items || [];
      setProjects(nextProjects);
      setProjectError(null);
      setSelectedProjectId((current) => {
        if (requestedProjectId && nextProjects.some((project) => String(project.id) === requestedProjectId)) {
          return requestedProjectId;
        }
        if (current && nextProjects.some((project) => String(project.id) === String(current))) {
          return String(current);
        }
        return nextProjects[0] ? String(nextProjects[0].id) : '';
      });

      if (import.meta.env.DEV) {
        console.debug('projects.load.success', {
          reason,
          requestId,
          projectCount: nextProjects.length,
        });
      }
    } catch (loadProjectsError) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return;
      }

      const normalizedErrorMessage = getApiErrorMessage(loadProjectsError, {
        fallbackMessage: 'Failed to load projects',
        operation: 'projects.load',
      });

      setProjects([]);
      setProjectError(normalizedErrorMessage);
      setSelectedProjectId('');

      if (import.meta.env.DEV) {
        console.debug('projects.load.error', {
          reason,
          requestId,
          message: normalizedErrorMessage,
          code: loadProjectsError?.code || null,
          status: loadProjectsError?.response?.status || null,
        });
      }
    } finally {
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setProjectsLoading(false);
      }
    }
  }, [getApiErrorMessage, getProjects, requestedProjectId]);

  useEffect(() => {
    loadProjects({ reason: 'initial' });
  }, [loadProjects]);

  const handleRetryProjectsLoad = useCallback(() => {
    if (import.meta.env.DEV) {
      console.debug('projects.load.retry', { requestedProjectId });
    }
    loadProjects({ reason: 'retry' });
  }, [loadProjects, requestedProjectId]);

  const handleCreateProject = useCallback(async (projectName) => {
    try {
      const createdProject = await createProject({ name: projectName });
      setProjects((currentProjects) => [createdProject, ...currentProjects]);
      setSelectedProjectId(String(createdProject.id));
    } catch (createProjectError) {
      throw new Error(getApiErrorMessage(createProjectError, {
        fallbackMessage: 'Failed to create project',
        operation: 'projects.create',
      }));
    }
  }, [createProject, getApiErrorMessage]);

  return {
    projects,
    projectsLoading,
    projectError,
    selectedProjectId,
    setSelectedProjectId,
    handleRetryProjectsLoad,
    handleCreateProject,
  };
}
