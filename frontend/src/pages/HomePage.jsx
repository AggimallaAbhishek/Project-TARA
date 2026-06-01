import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { AlertCircle, Sparkles } from 'lucide-react';

import { createProject, extractDiagram, getProjects } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { FullPageLoader } from '../components/LoadingSpinner';
import ProjectSelector from '../components/ProjectSelector';
import InputModeSwitcher from '../components/home/InputModeSwitcher';
import HomeSidebar from '../components/home/HomeSidebar';
import QuickExamplesSection from '../components/home/QuickExamplesSection';
import TextInputSection from '../components/home/TextInputSection';
import UmlCodeSection from '../components/home/UmlCodeSection';
import UploadSection from '../components/home/UploadSection';
import useProjectLoading from '../hooks/useProjectLoading';
import useUploadFlow from '../hooks/useUploadFlow';
import useAnalysisSubmission from '../hooks/useAnalysisSubmission';
import useUmlCodeInput from '../hooks/useUmlCodeInput';
import {
  DESCRIPTION_MAX_LENGTH,
  DIAGRAM_ACCEPT_TYPES,
  DOCUMENT_ACCEPT_TYPES,
  examples,
  MAX_DIAGRAM_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  quickActionIcons,
  strideCategories,
  TITLE_MAX_LENGTH,
  UML_CODE_ACCEPT_TYPES,
  UML_CODE_MAX_LENGTH,
  UML_CODE_MAX_UPLOAD_BYTES,
  UML_FORMAT_OPTIONS,
} from './homePageConfig';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [description, setDescription] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProjectId = searchParams.get('project_id') || '';

  const remainingDescriptionChars = DESCRIPTION_MAX_LENGTH - description.length;

  const {
    projects,
    projectsLoading,
    projectError,
    selectedProjectId,
    setSelectedProjectId,
    handleRetryProjectsLoad,
    handleCreateProject,
  } = useProjectLoading({
    requestedProjectId,
    getProjects,
    createProject,
    getApiErrorMessage,
  });

  const {
    isExtracting,
    uploadSource,
    diagramFile,
    documentFile,
    extractId,
    extractedDescription,
    sourceMetadata,
    setExtractedDescription,
    resetUploadState,
    handleUploadSourceChange,
    handleDiagramFileChange,
    handleExtractDiagram,
    handleDocumentFileChange,
  } = useUploadFlow({
    extractDiagram,
    getApiErrorMessage,
    maxDiagramUploadBytes: MAX_DIAGRAM_UPLOAD_BYTES,
    maxDocumentUploadBytes: MAX_DOCUMENT_UPLOAD_BYTES,
    setError,
  });

  const {
    umlFormat,
    umlCode,
    umlFileName,
    setUmlFormat,
    handleUmlCodeChange,
    handleUmlCodeFileChange,
    resetUmlInput,
  } = useUmlCodeInput({
    maxUploadBytes: UML_CODE_MAX_UPLOAD_BYTES,
    maxCodeLength: UML_CODE_MAX_LENGTH,
    onValidationError: setError,
    onClearError: () => setError(null),
  });

  const { submitAnalysis, isSubmitDisabled } = useAnalysisSubmission({
    navigate,
    getApiErrorMessage,
    setError,
    setIsLoading,
  });

  const handleModeChange = (mode) => {
    setInputMode(mode);
    setError(null);

    if (mode !== 'upload') {
      resetUploadState();
    }

    if (mode !== 'uml') {
      resetUmlInput();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await submitAnalysis({
      title,
      selectedProjectId,
      inputMode,
      description,
      uploadSource,
      extractId,
      extractedDescription,
      documentFile,
      umlFormat,
      umlCode,
    });
  };

  if (isLoading) {
    return <FullPageLoader text="Analyzing system threats..." />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <p className="page-kicker">Analysis Workspace</p>
          <h1 className="page-title">Threat Analysis & Risk Assessment</h1>
          <p className="page-subtitle">
            Submit architecture context, run STRIDE analysis, and review risk-prioritized findings.
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="section-card">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-lg flex items-start gap-3"
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

            <div className="mb-5">
              <label htmlFor="analysis-title" className="block text-sm font-semibold text-text-secondary mb-2">
                Analysis Title
              </label>
              <input
                id="analysis-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g., Healthcare Patient Portal"
                maxLength={TITLE_MAX_LENGTH}
                className="input-dark"
                required
              />
            </div>

            <InputModeSwitcher inputMode={inputMode} onModeChange={handleModeChange} />

            {inputMode === 'text' ? (
              <TextInputSection
                description={description}
                onDescriptionChange={setDescription}
                remainingDescriptionChars={remainingDescriptionChars}
                descriptionMaxLength={DESCRIPTION_MAX_LENGTH}
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
                onExtractDiagram={() => handleExtractDiagram({ title })}
                diagramAcceptTypes={DIAGRAM_ACCEPT_TYPES}
                documentAcceptTypes={DOCUMENT_ACCEPT_TYPES}
                descriptionMaxLength={DESCRIPTION_MAX_LENGTH}
              />
            ) : (
              <UmlCodeSection
                umlFormat={umlFormat}
                umlCode={umlCode}
                umlFileName={umlFileName}
                onUmlFormatChange={setUmlFormat}
                onUmlCodeChange={handleUmlCodeChange}
                onUmlCodeFileChange={handleUmlCodeFileChange}
                umlFormatOptions={UML_FORMAT_OPTIONS}
                umlCodeAcceptTypes={UML_CODE_ACCEPT_TYPES}
                umlCodeMaxLength={UML_CODE_MAX_LENGTH}
              />
            )}

            <motion.button
              type="submit"
              disabled={isSubmitDisabled({
                isExtracting,
                projectsLoading,
                inputMode,
                description,
                uploadSource,
                extractId,
                extractedDescription,
                documentFile,
                umlCode,
              })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-cyber flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <QuickExamplesSection
              examples={examples}
              onSelectExample={(example) => {
                setTitle(example.title);
                setDescription(example.description);
              }}
            />
          )}
        </motion.div>

        <HomeSidebar navigate={navigate} strideCategories={strideCategories} quickActionIcons={quickActionIcons} />
      </div>
    </div>
  );
}
