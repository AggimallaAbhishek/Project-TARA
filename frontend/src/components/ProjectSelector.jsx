import { useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';

export default function ProjectSelector({
  projects = [],
  selectedProjectId = '',
  onProjectChange,
  onCreateProject,
  loading = false,
  disabled = false,
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName || creating) return;
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
        disabled={loading || disabled || projects.length === 0}
        aria-label="Project"
      >
        <option value="">
          {loading ? 'Loading projects...' : projects.length === 0 ? 'Create a project first' : 'Select a project'}
        </option>
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
          disabled={disabled || creating}
          aria-label="New project name"
        />
        <button
          type="button"
          onClick={handleCreateProject}
          disabled={!newProjectName.trim() || disabled || creating}
          className="btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      {error && <p className="text-xs text-risk-critical mt-2">{error}</p>}
      {!loading && projects.length === 0 && (
        <p className="text-xs text-text-muted mt-2">
          Projects group related analyses so future changes stay in one workspace.
        </p>
      )}
    </div>
  );
}
