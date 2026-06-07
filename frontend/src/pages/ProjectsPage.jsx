import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { AlertCircle, FolderKanban, Plus, Search } from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import ProjectCard from '../components/ProjectCard';
import { createProject, getProjects } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState(null);

  const {
    data: projectsData,
    isLoading: loading,
    error: loadError,
  } = useQuery({
    queryKey: ['projects', { q: searchQuery, limit: 100 }],
    queryFn: () => getProjects({ q: searchQuery, limit: 100 }),
    keepPreviousData: true,
  });

  const projects = projectsData?.items || [];
  const total = projectsData?.total || 0;
  const error = loadError
    ? getApiErrorMessage(loadError, {
        fallbackMessage: 'Failed to load projects',
        operation: 'projects.load',
      })
    : null;

  const createMutation = useMutation({
    mutationFn: (newProject) => createProject(newProject),
    onSuccess: () => {
      setNewProjectName('');
      setNewProjectDescription('');
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      setCreateError(
        getApiErrorMessage(err, {
          fallbackMessage: 'Failed to create project',
          operation: 'projects.create',
        })
      );
    },
  });

  const creating = createMutation.isLoading || createMutation.isPending;

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!newProjectName.trim() || creating) return;
    setCreateError(null);
    createMutation.mutate({
      name: newProjectName,
      description: newProjectDescription,
    });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading projects..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-page-header"
      >
        <div>
          <div className="page-kicker">
            <FolderKanban className="w-5 h-5" />
            Project Section
          </div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {total} {total === 1 ? 'project' : 'projects'} grouping related analyses and changes
          </p>
        </div>

        <Link to="/" className="btn-cyber inline-flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Analysis
        </Link>
      </motion.div>

      <form
        onSubmit={handleSearch}
        className="ui-filter-bar mb-8"
      >
        <label className="sr-only" htmlFor="project-search">
          Search projects
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="project-search"
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by project name"
              className="input-dark pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-6 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-risk-critical">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ui-empty-state p-12"
        >
          <FolderKanban className="w-14 h-14 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {searchQuery ? 'No projects match your search' : 'No projects yet'}
          </h2>
          <p className="text-text-secondary">
            Create a project to group analyses, comparisons, exports, and change history in one place.
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleCreateProject}
        className="ui-panel mt-8"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-3">Create Project</h2>
        <div className="grid lg:grid-cols-[1fr_1fr_auto] gap-3 items-start">
          <input
            type="text"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="e.g., Banking Mobile App"
            maxLength={255}
            className="input-dark"
            aria-label="Project name"
          />
          <textarea
            value={newProjectDescription}
            onChange={(event) => setNewProjectDescription(event.target.value)}
            placeholder="Optional project notes"
            maxLength={2000}
            rows={3}
            className="textarea-dark"
            aria-label="Project description"
          />
          <button
            type="submit"
            disabled={!newProjectName.trim() || creating}
            className="btn-secondary w-full lg:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
        {createError && (
          <div className="mt-3 p-3 rounded-lg bg-risk-critical/10 border border-risk-critical/30 text-risk-critical text-sm flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {createError}
          </div>
        )}
      </form>
    </div>
  );
}
