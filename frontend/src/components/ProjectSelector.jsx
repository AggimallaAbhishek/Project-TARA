import { useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';

export default function ProjectSelector({
  projects = [],
  selectedProjectId = '',
  onProjectChange,
  onCreateProject,
  loading = false,
  disabled = false,
  loadError = null,
  onRetryLoadProjects = null,
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const hasLoadError = Boolean(loadError);
  const hasProjects = projects.length > 0;
  const selectorDisabled = loading || disabled || hasLoadError || !hasProjects;
  const createDisabled = disabled || creating || hasLoadError || loading;

  const selectorPlaceholder = loading
    ? 'Loading projects...'
    : hasLoadError
      ? 'Projects unavailable'
      : hasProjects
        ? 'Select a project'
        : 'Create a project first';

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName || creating || hasLoadError || loading) return;
    setCreating(true);
    setError('');
    try {
      await onCreateProject(trimmedName);
      setNewProjectName('');
    } catch (createError) {
      setError(createError?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-dark-border bg-dark-tertiary/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FolderKanban className="w-4 h-4 text-cyber-cyan" />
        <label htmlFor="project-selector" className="text-sm font-medium text-text-secondary">
          Project
        </label>
      </div>

      <select
        id="project-selector"
        value={selectedProjectId}
        onChange={(event) => onProjectChange(event.target.value)}
        className="input-dark"
        disabled={selectorDisabled}
        aria-label="Project"
      >
        <option value="">{selectorPlaceholder}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <div className="mt-3 grid sm:grid-cols-[1fr_auto] gap-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(event) => setNewProjectName(event.target.value)}
          placeholder="Create a new project folder"
          maxLength={255}
          className="input-dark"
          disabled={createDisabled}
          aria-label="New project name"
        />
        <button
          type="button"
          onClick={handleCreateProject}
          disabled={!newProjectName.trim() || createDisabled}
          className="btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      {hasLoadError && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-risk-critical">{loadError}</p>
          {typeof onRetryLoadProjects === 'function' && (
            <button
              type="button"
              onClick={onRetryLoadProjects}
              disabled={loading || disabled}
              className="inline-flex items-center rounded-md border border-dark-border px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-cyber-cyan/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Retrying...' : 'Retry project load'}
            </button>
          )}
        </div>
      )}
      {!hasLoadError && error && <p className="text-xs text-risk-critical mt-2">{error}</p>}
      {!loading && !hasLoadError && projects.length === 0 && (
        <p className="text-xs text-text-muted mt-2">
          Projects group related analyses so future changes stay in one workspace.
        </p>
      )}
    </div>
  );
}
