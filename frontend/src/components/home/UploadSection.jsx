import { useRef, useState } from 'react';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  FileCheck,
  FileSearch,
  Loader2,
  UploadCloud,
} from 'lucide-react';

function createFileChangeEvent(files) {
  return {
    target: {
      files,
    },
  };
}

function formatFileSize(file) {
  if (!file) return '';
  return `${Math.ceil(file.size / 1024)} KB`;
}

function DropZone({
  id,
  label,
  helpText,
  selectedFile,
  accept,
  onFileChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const openFilePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles?.length) {
      onFileChange(createFileChangeEvent(droppedFiles));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="sr-only"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={openFilePicker}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        disabled={disabled}
        className={`w-full rounded-lg border border-dashed p-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          isDragging
              ? 'border-cyber-cyan bg-cyber-cyan/10 text-text-primary'
            : selectedFile
              ? 'border-cyber-cyan/45 bg-cyber-cyan/10 text-text-primary'
              : 'border-dark-border bg-dark-tertiary/60 text-text-secondary hover:border-cyber-cyan/40 hover:bg-dark-elevated/60'
        }`}
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/10 text-cyber-cyan">
            {selectedFile ? <FileCheck className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {selectedFile ? selectedFile.name : 'Drop a file here or browse'}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-text-muted">
              {selectedFile ? `Selected file size: ${formatFileSize(selectedFile)}` : helpText}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

function UploadStep({ label, state }) {
  const Icon = state === 'active' ? Loader2 : state === 'complete' || state === 'skipped' ? CheckCircle2 : Circle;
  const stateLabel = state === 'active'
    ? 'In progress'
    : state === 'complete'
      ? 'Done'
      : state === 'skipped'
        ? 'Skipped'
        : 'Pending';

  return (
    <li className={`rounded-lg border px-3 py-2 ${
      state === 'complete'
        ? 'border-cyber-cyan/35 bg-cyber-cyan/10 text-text-primary'
        : state === 'active'
          ? 'border-risk-medium/40 bg-risk-medium/10 text-risk-medium'
          : state === 'skipped'
            ? 'border-dark-border bg-dark-tertiary/45 text-text-muted'
            : 'border-dark-border bg-dark-tertiary/35 text-text-muted'
    }`}
    >
      <span className="flex items-center gap-2">
        <Icon className={`h-4 w-4 flex-shrink-0 ${state === 'active' ? 'animate-spin' : ''}`} />
        <span className="min-w-0">
          <span className="block text-xs font-semibold">{label}</span>
          <span className="block text-[11px]">{stateLabel}</span>
        </span>
      </span>
    </li>
  );
}

function UploadProgress({ uploadSource, diagramFile, documentFile, isExtracting, extractId, extractedDescription }) {
  const hasReviewedExtraction = Boolean(extractId && extractedDescription.trim());
  const steps = uploadSource === 'diagram'
    ? [
      { label: 'Select file', state: diagramFile ? 'complete' : 'pending' },
      { label: 'Extract', state: isExtracting ? 'active' : extractId ? 'complete' : 'pending' },
      { label: 'Review', state: hasReviewedExtraction ? 'complete' : extractId ? 'active' : 'pending' },
      { label: 'Ready', state: hasReviewedExtraction ? 'complete' : 'pending' },
    ]
    : [
      { label: 'Select file', state: documentFile ? 'complete' : 'pending' },
      { label: 'Extract', state: 'skipped' },
      { label: 'Review', state: 'skipped' },
      { label: 'Ready', state: documentFile ? 'complete' : 'pending' },
    ];

  return (
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Upload progress">
      {steps.map((step) => (
        <UploadStep key={step.label} label={step.label} state={step.state} />
      ))}
    </ol>
  );
}

export default function UploadSection({
  uploadSource,
  onUploadSourceChange,
  title,
  diagramFile,
  documentFile,
  isExtracting,
  extractId,
  extractedDescription,
  sourceMetadata,
  onExtractedDescriptionChange,
  onDiagramFileChange,
  onDocumentFileChange,
  onExtractDiagram,
  diagramAcceptTypes,
  documentAcceptTypes,
  descriptionMaxLength,
}) {
  return (
    <div className="mb-6 space-y-4">
      <div>
        <span className="block text-sm font-medium text-text-secondary mb-2">
          Upload Source
        </span>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-dark-border bg-dark-tertiary/60">
          <button
            type="button"
            onClick={() => onUploadSourceChange('diagram')}
            className={`px-3 py-2 rounded-md border text-sm transition-colors ${
              uploadSource === 'diagram'
                ? 'border-dark-border-strong text-text-primary bg-dark-secondary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated/70'
            }`}
          >
            Diagram
          </button>
          <button
            type="button"
            onClick={() => onUploadSourceChange('document')}
            className={`px-3 py-2 rounded-md border text-sm transition-colors ${
              uploadSource === 'document'
                ? 'border-dark-border-strong text-text-primary bg-dark-secondary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated/70'
            }`}
          >
            Document
          </button>
        </div>
      </div>

      {uploadSource === 'diagram' ? (
        <>
          <DropZone
            id="diagram-file"
            label="Upload Architecture Diagram"
            helpText="Supported: PNG, JPG, JPEG, PDF, Mermaid, PlantUML, draw.io XML. Max size: 10 MB."
            selectedFile={diagramFile}
            accept={diagramAcceptTypes}
            onFileChange={onDiagramFileChange}
            disabled={isExtracting}
          />

          <UploadProgress
            uploadSource={uploadSource}
            diagramFile={diagramFile}
            documentFile={documentFile}
            isExtracting={isExtracting}
            extractId={extractId}
            extractedDescription={extractedDescription}
          />

          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExtractDiagram}
              disabled={!title.trim() || !diagramFile || isExtracting}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? 'Extracting Architecture...' : extractId ? 'Re-extract Architecture' : 'Extract Architecture'}
            </motion.button>
            {sourceMetadata && (
              <span className="text-xs text-text-muted">
                {sourceMetadata.input_type} | {sourceMetadata.extractor_used}
                {sourceMetadata.pages_processed ? ` | pages: ${sourceMetadata.pages_processed}` : ''}
              </span>
            )}
          </div>

          {extractId && (
            <div>
              <label htmlFor="extracted-description" className="block text-sm font-medium text-text-secondary mb-2">
                <span className="inline-flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-cyber-cyan" />
                  Review Extracted Architecture
                </span>
              </label>
              <textarea
                id="extracted-description"
                value={extractedDescription}
                onChange={(event) => onExtractedDescriptionChange(event.target.value)}
                rows={8}
                maxLength={descriptionMaxLength}
                className="textarea-dark"
                placeholder="Extracted architecture description will appear here..."
              />
              <p className="mt-2 text-xs text-text-muted">
                Edit this text before running threat analysis.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <DropZone
            id="document-file"
            label="Upload Document"
            helpText="Supported: PDF, TXT. Max size: 10 MB."
            selectedFile={documentFile}
            accept={documentAcceptTypes}
            onFileChange={onDocumentFileChange}
          />

          <UploadProgress
            uploadSource={uploadSource}
            diagramFile={diagramFile}
            documentFile={documentFile}
            isExtracting={isExtracting}
            extractId={extractId}
            extractedDescription={extractedDescription}
          />
        </>
      )}
    </div>
  );
}
