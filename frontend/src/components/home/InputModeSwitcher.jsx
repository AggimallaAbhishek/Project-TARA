export default function InputModeSwitcher({ inputMode, onModeChange }) {
  return (
    <div className="mb-5">
      <span className="block text-sm font-medium text-text-secondary mb-2">
        Input Mode
      </span>
      <div className="grid grid-cols-3 gap-2 p-1 rounded-lg border border-dark-border bg-dark-tertiary/60">
        <button
          type="button"
          onClick={() => onModeChange('text')}
          className={`px-3 py-2 rounded-md border text-sm transition-colors ${
            inputMode === 'text'
              ? 'border-dark-border-strong text-text-primary bg-dark-secondary'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated/70'
          }`}
        >
          Text Description
        </button>
        <button
          type="button"
          onClick={() => onModeChange('upload')}
          className={`px-3 py-2 rounded-md border text-sm transition-colors ${
            inputMode === 'upload'
              ? 'border-dark-border-strong text-text-primary bg-dark-secondary'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated/70'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => onModeChange('uml')}
          className={`px-3 py-2 rounded-md border text-sm transition-colors ${
            inputMode === 'uml'
              ? 'border-dark-border-strong text-text-primary bg-dark-secondary'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated/70'
          }`}
        >
          UML Code
        </button>
      </div>
    </div>
  );
}
