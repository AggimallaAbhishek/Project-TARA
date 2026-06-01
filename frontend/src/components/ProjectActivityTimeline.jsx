import { GitCompareArrows, Pencil, Plus, Download, Trash2, FileText, FolderPlus } from 'lucide-react';

const ACTION_LABELS = {
  project_created: 'Project created',
  project_updated: 'Project updated',
  analysis_created: 'Analysis created',
  analysis_deleted: 'Analysis deleted',
  pdf_exported: 'PDF exported',
  comparison_created: 'Comparison created',
};

const ACTION_ICONS = {
  project_created: FolderPlus,
  project_updated: Pencil,
  analysis_created: Plus,
  analysis_deleted: Trash2,
  pdf_exported: Download,
  comparison_created: GitCompareArrows,
};

function buildDetail(event) {
  const metadata = event.event_metadata || {};
  if (metadata.title) return metadata.title;
  if (metadata.project_name) return metadata.project_name;
  if (metadata.analysis_ids?.length) return `${metadata.analysis_ids.length} analyses compared`;
  return 'Project activity';
}

export default function ProjectActivityTimeline({ activity = [] }) {
  if (activity.length === 0) {
    return (
      <div className="empty-state p-6">
        <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary">No project activity yet.</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2 className="section-title mb-4">Activity</h2>
      <div className="space-y-4">
        {activity.map((event) => {
          const Icon = ACTION_ICONS[event.action] || FileText;
          return (
            <div key={event.id} className="flex gap-3 rounded-lg border border-dark-border bg-dark-tertiary/65 p-3">
              <div className="w-9 h-9 rounded-lg bg-dark-elevated border border-dark-border-strong flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {ACTION_LABELS[event.action] || event.action}
                </p>
                <p className="text-sm text-text-secondary truncate">
                  {buildDetail(event)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
