export default function TextInputSection({
  description,
  onDescriptionChange,
  remainingDescriptionChars,
  descriptionMaxLength,
}) {
  return (
    <div className="mb-6">
      <label htmlFor="system-description" className="block text-sm font-medium text-text-secondary mb-2">
        System Architecture Description
      </label>
      <textarea
        id="system-description"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Describe your system's components, technologies, data flows, and security mechanisms..."
        rows={8}
        maxLength={descriptionMaxLength}
        className="textarea-dark"
        required
      />
      <p className="mt-2 text-xs text-text-muted flex items-center justify-between">
        The more detail you provide, the more accurate the threat analysis will be.
        <span className={remainingDescriptionChars < 200 ? 'text-risk-medium' : ''}>
          {remainingDescriptionChars} characters left
        </span>
      </p>
    </div>
  );
}
