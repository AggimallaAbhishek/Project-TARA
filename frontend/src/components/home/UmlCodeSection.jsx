export default function UmlCodeSection({
  umlFormat,
  umlCode,
  umlFileName,
  onUmlFormatChange,
  onUmlCodeChange,
  onUmlCodeFileChange,
  umlFormatOptions,
  umlCodeAcceptTypes,
  umlCodeMaxLength,
}) {
  return (
    <div className="mb-6 space-y-4">
      <div>
        <label htmlFor="uml-format" className="block text-sm font-medium text-text-secondary mb-2">
          UML Format
        </label>
        <select
          id="uml-format"
          value={umlFormat}
          onChange={(event) => onUmlFormatChange(event.target.value)}
          className="input-dark"
        >
          {umlFormatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="uml-code-file" className="block text-sm font-medium text-text-secondary mb-2">
          Attach UML/Mermaid File (Optional)
        </label>
        <input
          id="uml-code-file"
          type="file"
          accept={umlCodeAcceptTypes}
          onChange={onUmlCodeFileChange}
          className="input-dark cursor-pointer"
        />
        <p className="mt-2 text-xs text-text-muted">
          Supported: .mmd, .mermaid, .puml, .plantuml, .uml, .txt (max 2 MB).
        </p>
        {umlFileName && (
          <p className="mt-1 text-xs text-text-secondary">
            Loaded file: {umlFileName}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="uml-code" className="block text-sm font-medium text-text-secondary mb-2">
          UML Code
        </label>
        <textarea
          id="uml-code"
          value={umlCode}
          onChange={(event) => onUmlCodeChange(event.target.value)}
          placeholder={umlFormat === 'mermaid'
            ? 'graph TD\nClient[Browser] --> API[Gateway]\nAPI --> DB[(Database)]'
            : '@startuml\nactor User\ncomponent API\ndatabase DB\nUser -> API\nAPI -> DB\n@enduml'}
          rows={10}
          maxLength={umlCodeMaxLength}
          className="textarea-dark font-mono text-sm"
        />
        <p className="mt-2 text-xs text-text-muted flex items-center justify-between gap-2">
          <span>Paste Mermaid or PlantUML code to run threat analysis and render a diagram in the Analysis page.</span>
          <span>{umlCode.length.toLocaleString()} / {umlCodeMaxLength.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}
