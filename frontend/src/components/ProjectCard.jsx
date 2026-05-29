import { Link } from 'react-router-dom';
import { Calendar, FileText, FolderKanban, Plus, ShieldAlert } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'No analyses yet';
  return new Date(value).toLocaleDateString();
}

export default function ProjectCard({ project }) {
  const latestScore = project.latest_risk_score == null
    ? 'N/A'
    : Number(project.latest_risk_score).toFixed(1);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="card-dark p-5 block hover:border-cyber-cyan/40 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-cyber-cyan text-xs font-semibold uppercase tracking-wide mb-2">
            <FolderKanban className="w-4 h-4" />
            Project
          </div>
          <h2 className="text-xl font-semibold text-text-primary group-hover:text-cyber-cyan transition-colors truncate">
            {project.name}
          </h2>
          {project.description && (
            <p className="text-sm text-text-secondary mt-2 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="text-center px-3 py-2 rounded-lg bg-dark-tertiary">
          <div className="text-lg font-bold text-cyber-cyan">{latestScore}</div>
          <div className="text-xs text-text-muted">Score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-dark-tertiary/60 p-3">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <FileText className="w-4 h-4" />
            Analyses
          </div>
          <div className="text-text-primary font-semibold">{project.analysis_count}</div>
        </div>
        <div className="rounded-lg bg-dark-tertiary/60 p-3">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <ShieldAlert className="w-4 h-4" />
            High/Critical
          </div>
          <div className="text-risk-critical font-semibold">{project.high_risk_count}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Latest: {formatDate(project.latest_analysis_at)}
        </span>
        <span className="inline-flex items-center gap-1 text-cyber-cyan">
          <Plus className="w-4 h-4" />
          Open workspace
        </span>
      </div>
    </Link>
  );
}
