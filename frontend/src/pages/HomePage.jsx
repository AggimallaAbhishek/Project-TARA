import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { createProject, extractDiagram, getProjects } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { FullPageLoader } from '../components/LoadingSpinner';
import { OrbitalDashboard } from '../components/orbital';
import useProjectLoading from '../hooks/useProjectLoading';
import useUploadFlow from '../hooks/useUploadFlow';
import useAnalysisSubmission from '../hooks/useAnalysisSubmission';
import useUmlCodeInput from '../hooks/useUmlCodeInput';
import useOrbitalDashboardData from '../hooks/useOrbitalDashboardData';
import {
  DESCRIPTION_MAX_LENGTH,
  DIAGRAM_ACCEPT_TYPES,
  DOCUMENT_ACCEPT_TYPES,
  examples,
  MAX_DIAGRAM_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_BYTES,
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

  const { dashboard, loading: dashboardLoading, errors: dashboardErrors } = useOrbitalDashboardData();

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
    <OrbitalDashboard
      form={{
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
        handleExtractDiagram: () => handleExtractDiagram({ title }),
        umlFormat,
        umlCode,
        umlFileName,
        setUmlFormat,
        handleUmlCodeChange,
        handleUmlCodeFileChange,
        descriptionMaxLength: DESCRIPTION_MAX_LENGTH,
        titleMaxLength: TITLE_MAX_LENGTH,
        diagramAcceptTypes: DIAGRAM_ACCEPT_TYPES,
        documentAcceptTypes: DOCUMENT_ACCEPT_TYPES,
        umlFormatOptions: UML_FORMAT_OPTIONS,
        umlCodeAcceptTypes: UML_CODE_ACCEPT_TYPES,
        umlCodeMaxLength: UML_CODE_MAX_LENGTH,
      }}
      onSubmit={handleSubmit}
      onModeChange={handleModeChange}
      isSubmitDisabled={isSubmitDisabled({
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
      examples={examples}
      onSelectExample={(example) => {
        setTitle(example.title);
        setDescription(example.description);
      }}
      dashboard={dashboard}
      loading={dashboardLoading}
      errors={dashboardErrors}
    />
  );
}
