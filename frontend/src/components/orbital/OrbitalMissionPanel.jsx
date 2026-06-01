/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { AlertCircle, Sparkles } from 'lucide-react';
import ProjectSelector from '../ProjectSelector';
import InputModeSwitcher from '../home/InputModeSwitcher';
import TextInputSection from '../home/TextInputSection';
import UploadSection from '../home/UploadSection';
import UmlCodeSection from '../home/UmlCodeSection';
import QuickExamplesSection from '../home/QuickExamplesSection';

export default function OrbitalMissionPanel({
  form,
  onSubmit,
  onModeChange,
  isSubmitDisabled,
  examples,
  onSelectExample,
}) {
  const {
    error,
    title,
    setTitle,
    inputMode,
    description,
    setDescription,
    remainingDescriptionChars,
    projects,
    projectsLoading,
    projectError,
    selectedProjectId,
    setSelectedProjectId,
    handleRetryProjectsLoad,
    handleCreateProject,
    isLoading,
    isExtracting,
    uploadSource,
    handleUploadSourceChange,
    diagramFile,
    documentFile,
    extractId,
    extractedDescription,
    sourceMetadata,
    setExtractedDescription,
    handleDiagramFileChange,
    handleDocumentFileChange,
    handleExtractDiagram,
    umlFormat,
    umlCode,
    umlFileName,
    setUmlFormat,
    handleUmlCodeChange,
    handleUmlCodeFileChange,
    descriptionMaxLength,
    titleMaxLength,
    diagramAcceptTypes,
    documentAcceptTypes,
    umlFormatOptions,
    umlCodeAcceptTypes,
    umlCodeMaxLength,
  } = form;

  return (
    <section className="orbital-panel orbital-mission-panel" aria-label="mission input panel">
      <div className="orbital-panel-header">
        <h2 className="orbital-panel-title">MISSION INPUT</h2>
        <span className="orbital-badge">ANALYSIS WORKSPACE</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 orbital-mission-form">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="orbital-form-error"
          >
            <AlertCircle className="w-5 h-5 text-risk-critical flex-shrink-0 mt-0.5" />
            <p className="text-sm text-risk-critical">{error}</p>
          </motion.div>
        )}

        <ProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          onCreateProject={handleCreateProject}
          loading={projectsLoading}
          disabled={isLoading || isExtracting}
          loadError={projectError}
          onRetryLoadProjects={handleRetryProjectsLoad}
        />

        <div>
          <label htmlFor="analysis-title" className="block text-sm font-semibold text-text-secondary mb-2">
            Analysis Title
          </label>
          <input
            id="analysis-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g., Healthcare Patient Portal"
            maxLength={titleMaxLength}
            className="input-dark"
            required
          />
        </div>

        <InputModeSwitcher inputMode={inputMode} onModeChange={onModeChange} />

        {inputMode === 'text' ? (
          <TextInputSection
            description={description}
            onDescriptionChange={setDescription}
            remainingDescriptionChars={remainingDescriptionChars}
            descriptionMaxLength={descriptionMaxLength}
          />
        ) : inputMode === 'upload' ? (
          <UploadSection
            uploadSource={uploadSource}
            onUploadSourceChange={handleUploadSourceChange}
            title={title}
            diagramFile={diagramFile}
            documentFile={documentFile}
            isExtracting={isExtracting}
            extractId={extractId}
            extractedDescription={extractedDescription}
            sourceMetadata={sourceMetadata}
            onExtractedDescriptionChange={setExtractedDescription}
            onDiagramFileChange={handleDiagramFileChange}
            onDocumentFileChange={handleDocumentFileChange}
            onExtractDiagram={handleExtractDiagram}
            diagramAcceptTypes={diagramAcceptTypes}
            documentAcceptTypes={documentAcceptTypes}
            descriptionMaxLength={descriptionMaxLength}
          />
        ) : (
          <UmlCodeSection
            umlFormat={umlFormat}
            umlCode={umlCode}
            umlFileName={umlFileName}
            onUmlFormatChange={setUmlFormat}
            onUmlCodeChange={handleUmlCodeChange}
            onUmlCodeFileChange={handleUmlCodeFileChange}
            umlFormatOptions={umlFormatOptions}
            umlCodeAcceptTypes={umlCodeAcceptTypes}
            umlCodeMaxLength={umlCodeMaxLength}
          />
        )}

        <motion.button
          type="submit"
          disabled={isSubmitDisabled}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full btn-cyber orbital-submit-btn flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          {inputMode === 'text'
            ? 'Analyze System Threats'
            : inputMode === 'upload'
              ? (uploadSource === 'diagram' ? 'Analyze Diagram Threats' : 'Analyze Document Threats')
              : 'Analyze UML Threats'}
        </motion.button>
      </form>

      {inputMode === 'text' && (
        <div className="mt-4">
          <QuickExamplesSection examples={examples} onSelectExample={onSelectExample} />
        </div>
      )}
    </section>
  );
}
