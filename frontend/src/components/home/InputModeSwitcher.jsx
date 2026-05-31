export default function InputModeSwitcher({ inputMode, onModeChange }) {
  return (
    <div className="mb-5">
      <span className="block text-sm font-medium text-text-secondary mb-2">
        Input Mode
      </span>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onModeChange('text')}
          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
            inputMode === 'text'
              ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
              : 'border-dark-border text-text-secondary bg-dark-tertiary'
          }`}
        >
          Text Description
        </button>
        <button
          type="button"
          onClick={() => onModeChange('upload')}
          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
            inputMode === 'upload'
              ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
              : 'border-dark-border text-text-secondary bg-dark-tertiary'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => onModeChange('uml')}
          className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
            inputMode === 'uml'
              ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
              : 'border-dark-border text-text-secondary bg-dark-tertiary'
          }`}
        >
          UML Code
        </button>
      </div>
    </div>
  );
}
