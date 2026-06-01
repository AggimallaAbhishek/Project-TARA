import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Pencil,
  FileText,
  GitCompareArrows,
  Plus,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import ProjectActivityTimeline from '../components/ProjectActivityTimeline';
import RiskBadge from '../components/RiskBadge';
import { getProject, getProjectActivity, getProjectAnalyses, updateProject } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

function getRiskBadgeLevel(score) {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('');
  const [projectUpdateLoading, setProjectUpdateLoading] = useState(false);
  const [projectUpdateError, setProjectUpdateError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadProjectWorkspace = async () => {
      setLoading(true);
      try {
        const [projectData, analysesData, activityData] = await Promise.all([
          getProject(projectId),
          getProjectAnalyses(projectId, { limit: 20 }),
          getProjectActivity(projectId, { limit: 50 }),
        ]);
        if (!isMounted) return;
        setProject(projectData);
        setAnalyses(analysesData.items || []);
        setActivity(activityData || []);
        setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(loadError, {
          fallbackMessage: 'Failed to load project',
          operation: 'projects.detail',
        }));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProjectWorkspace();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    setProjectNameDraft(project.name || '');
    setProjectDescriptionDraft(project.description || '');
  }, [project]);

  const handleProjectUpdate = async (event) => {
    event.preventDefault();
    if (!project || projectUpdateLoading) return;

    const trimmedName = projectNameDraft.trim();
    if (!trimmedName) {
      setProjectUpdateError('Project name cannot be blank.');
      return;
    }

    const payload = {};
    if (trimmedName !== (project.name || '').trim()) {
      payload.name = trimmedName;
    }

    const normalizedDescription = projectDescriptionDraft.trim();
    const currentDescription = (project.description || '').trim();
    if (normalizedDescription !== currentDescription) {
      payload.description = normalizedDescription || null;
    }

    if (Object.keys(payload).length === 0) {
      setProjectUpdateError('');
      setIsEditingProject(false);
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('projects.update.submit', {
        projectId: project.id,
        updatedFields: Object.keys(payload),
      });
    }

    setProjectUpdateError('');
    setProjectUpdateLoading(true);
    try {
      const updatedProject = await updateProject(project.id, payload);
      setProject(updatedProject);
      setIsEditingProject(false);
      if (import.meta.env.DEV) {
        console.debug('projects.update.success', {
          projectId: updatedProject.id,
          updatedFields: Object.keys(payload),
        });
      }
    } catch (updateError) {
      if (import.meta.env.DEV) {
        console.debug('projects.update.failed', {
          projectId: project.id,
          message: updateError?.message || 'unknown',
        });
      }
      setProjectUpdateError(getApiErrorMessage(updateError, {
        fallbackMessage: 'Failed to update project',
        operation: 'projects.update',
      }));
    } finally {
      setProjectUpdateLoading(false);
    }
  };

  const handleCancelProjectEdit = () => {
    if (!project || projectUpdateLoading) return;
    setProjectNameDraft(project.name || '');
    setProjectDescriptionDraft(project.description || '');
    setProjectUpdateError('');
    setIsEditingProject(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading project workspace..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-risk-critical text-lg mb-4">{error || 'Project not found'}</div>
        <Link to="/projects" className="text-cyber-cyan hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link to="/projects" className="inline-flex items-center gap-2 text-text-secondary hover:text-cyber-cyan transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-page-header mb-6"
      >
        <div>
          <p className="page-kicker">Project Workspace</p>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">Track analyses, risk changes, and project activity in one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setProjectNameDraft(project.name || '');
              setProjectDescriptionDraft(project.description || '');
              setProjectUpdateError('');
              setIsEditingProject((value) => !value);
            }}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Pencil className="w-5 h-5" />
            {isEditingProject ? 'Close Edit' : 'Edit Project'}
          </button>
          <Link to={`/?project_id=${project.id}`} className="btn-cyber inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Analysis
          </Link>
          <Link to={`/compare?project_id=${project.id}`} className="btn-secondary inline-flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5" />
            Compare
          </Link>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-panel mb-6"
      >
        {project.description ? (
          <p className="text-text-secondary">{project.description}</p>
        ) : (
          <p className="text-text-muted text-sm">No project description provided.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="stat-tile">
            <p className="text-xs text-text-muted flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Analyses
            </p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{project.analysis_count}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs text-text-muted flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              High/Critical
            </p>
            <p className="text-2xl font-semibold text-risk-critical mt-1">{project.high_risk_count}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs text-text-muted flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Threats
            </p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{project.total_threat_count}</p>
          </div>
          <div className="stat-tile">
            <p className="text-xs text-text-muted flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Latest
            </p>
            <p className="text-sm font-semibold text-text-primary mt-2">
              {project.latest_analysis_at ? new Date(project.latest_analysis_at).toLocaleDateString() : 'No analyses'}
            </p>
          </div>
        </div>
      </motion.section>

      {isEditingProject && (
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleProjectUpdate}
          className="ui-panel mb-6 space-y-4"
        >
          <h2 className="section-title">Edit Project</h2>
          <div>
            <label htmlFor="project-edit-name" className="block text-xs text-text-secondary mb-1">
              Project Name
            </label>
            <input
              id="project-edit-name"
              type="text"
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              maxLength={255}
              className="input-dark"
              required
            />
          </div>
          <div>
            <label htmlFor="project-edit-description" className="block text-xs text-text-secondary mb-1">
              Project Description
            </label>
            <textarea
              id="project-edit-description"
              value={projectDescriptionDraft}
              onChange={(event) => setProjectDescriptionDraft(event.target.value)}
              maxLength={2000}
              rows={3}
              className="textarea-dark"
            />
          </div>
          {projectUpdateError && (
            <div className="ui-alert error">
              {projectUpdateError}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={projectUpdateLoading}
              className="btn-cyber inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {projectUpdateLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancelProjectEdit}
              disabled={projectUpdateLoading}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="section-title">Project Analyses</h2>
            <Link to="/history" className="text-sm text-cyber-cyan hover:text-text-primary transition-colors">
              Open global history
            </Link>
          </div>

          {analyses.length === 0 ? (
            <div className="ui-empty-state p-8">
              <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary mb-4">No analyses in this project yet.</p>
              <Link to={`/?project_id=${project.id}`} className="btn-cyber inline-flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Run First Analysis
              </Link>
            </div>
          ) : (
            analyses.map((analysis) => (
              <Link
                key={analysis.id}
                to={`/analysis/${analysis.id}`}
                className="ui-panel p-5 block hover:border-dark-border-strong transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary truncate hover:text-cyber-cyan transition-colors">{analysis.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Number(analysis.analysis_time || 0).toFixed(1)}s
                      </span>
                      <span>{analysis.threat_count} threats</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="stat-tile text-center px-3 py-1 min-w-[92px]">
                      <div className="text-lg font-bold text-cyber-cyan">
                        {Number(analysis.total_risk_score || 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-text-muted">Score</div>
                    </div>
                    <RiskBadge level={getRiskBadgeLevel(analysis.total_risk_score)} showIcon={false} size="small" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ProjectActivityTimeline activity={activity} />
        </motion.div>
      </div>
    </div>
  );
}
