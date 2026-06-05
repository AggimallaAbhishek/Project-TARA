import { Code2, FileText, UploadCloud } from 'lucide-react';

const MODE_OPTIONS = [
  {
    value: 'text',
    label: 'Text Description',
    description: 'Describe components, data flows, and controls.',
    icon: FileText,
  },
  {
    value: 'upload',
    label: 'Upload File',
    description: 'Analyze diagrams or architecture documents.',
    icon: UploadCloud,
  },
  {
    value: 'uml',
    label: 'UML Code',
    description: 'Paste or attach Mermaid and PlantUML.',
    icon: Code2,
  },
];

export default function InputModeSwitcher({ inputMode, onModeChange }) {
  return (
    <div className="mb-5">
      <span className="block text-sm font-medium text-text-secondary mb-2">
        Input Mode
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = inputMode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onModeChange(option.value)}
              className={`group rounded-lg border p-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-cyber-cyan/60 bg-cyber-cyan/10 text-text-primary shadow-inner-soft'
                  : 'border-dark-border bg-dark-tertiary/60 text-text-secondary hover:border-cyber-cyan/35 hover:bg-dark-elevated/70 hover:text-text-primary'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                  isActive
                    ? 'border-cyber-cyan/45 bg-cyber-cyan/15 text-cyber-cyan'
                    : 'border-dark-border bg-dark-secondary text-text-muted group-hover:text-cyber-cyan'
                }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {option.label}
              </span>
              <span aria-hidden="true" className="mt-2 block text-xs leading-relaxed text-text-muted">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
