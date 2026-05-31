/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';

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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onUploadSourceChange('diagram')}
            className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
              uploadSource === 'diagram'
                ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                : 'border-dark-border text-text-secondary bg-dark-tertiary'
            }`}
          >
            Diagram
          </button>
          <button
            type="button"
            onClick={() => onUploadSourceChange('document')}
            className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
              uploadSource === 'document'
                ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                : 'border-dark-border text-text-secondary bg-dark-tertiary'
            }`}
          >
            Document
          </button>
        </div>
      </div>

      {uploadSource === 'diagram' ? (
        <>
          <div>
            <label htmlFor="diagram-file" className="block text-sm font-medium text-text-secondary mb-2">
              Upload Architecture Diagram
            </label>
            <input
              id="diagram-file"
              type="file"
              accept={diagramAcceptTypes}
              onChange={onDiagramFileChange}
              className="input-dark cursor-pointer"
            />
            <p className="mt-2 text-xs text-text-muted">
              Supported: PNG, JPG, JPEG, PDF, Mermaid, PlantUML, draw.io XML. Max size: 10 MB.
            </p>
            {diagramFile && (
              <p className="mt-1 text-xs text-text-secondary">
                Selected: {diagramFile.name} ({Math.ceil(diagramFile.size / 1024)} KB)
              </p>
            )}
          </div>

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
                Review Extracted Architecture
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
        <div>
          <label htmlFor="document-file" className="block text-sm font-medium text-text-secondary mb-2">
            Upload Document
          </label>
          <input
            id="document-file"
            type="file"
            accept={documentAcceptTypes}
            onChange={onDocumentFileChange}
            className="input-dark cursor-pointer"
          />
          <p className="mt-2 text-xs text-text-muted">
            Supported: PDF, TXT. Max size: 10 MB.
          </p>
          {documentFile && (
            <p className="mt-1 text-xs text-text-secondary">
              Selected: {documentFile.name} ({Math.ceil(documentFile.size / 1024)} KB)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
