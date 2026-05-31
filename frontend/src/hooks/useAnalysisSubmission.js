import {
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
} from '../services/api';

function getSubmissionValidationError({
  title,
  selectedProjectId,
  inputMode,
  description,
  uploadSource,
  extractId,
  extractedDescription,
  documentFile,
  umlCode,
}) {
  if (!title.trim()) {
    return 'Enter an analysis title before running analysis.';
  }

  if (!selectedProjectId) {
    return 'Select or create a project before running analysis.';
  }

  if (inputMode === 'text' && !description.trim()) {
    return 'Enter a system architecture description before analysis.';
  }

  if (inputMode === 'upload' && uploadSource === 'diagram' && (!extractId || !extractedDescription.trim())) {
    return 'Extract architecture from the uploaded diagram before analysis.';
  }

  if (inputMode === 'upload' && uploadSource === 'document' && !documentFile) {
    return 'Upload a document before analysis.';
  }

  if (inputMode === 'uml' && !umlCode.trim()) {
    return 'Paste UML code or attach a UML file before analysis.';
  }

  return null;
}

function getOperationForMode(inputMode, uploadSource) {
  if (inputMode === 'text') {
    return 'analysis.create';
  }

  if (inputMode === 'upload') {
    return uploadSource === 'diagram' ? 'diagram.analyze' : 'document.analyze';
  }

  return 'diagram.analyze_code';
}

export default function useAnalysisSubmission({ navigate, getApiErrorMessage, setError, setIsLoading }) {
  const submitAnalysis = async ({
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
  }) => {
    const validationError = getSubmissionValidationError({
      title,
      selectedProjectId,
      inputMode,
      description,
      uploadSource,
      extractId,
      extractedDescription,
      documentFile,
      umlCode,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const projectOptions = { projectId: Number(selectedProjectId) };
      const result = inputMode === 'text'
        ? await analyzeSystem(title, description, projectOptions)
        : inputMode === 'upload'
          ? (uploadSource === 'diagram'
            ? await analyzeFromDiagram(title, extractId, extractedDescription, projectOptions)
            : await analyzeDocument(title, documentFile, projectOptions))
          : await analyzeFromUmlCode(title, umlFormat, umlCode, projectOptions);

      const analysisId = result?.id ?? result?.analysis?.id;
      if (!analysisId) {
        throw new Error('Missing analysis ID in API response');
      }

      navigate(`/analysis/${analysisId}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(getApiErrorMessage(err, {
        fallbackMessage: 'Failed to analyze system. Please check if the backend is running.',
        operation: getOperationForMode(inputMode, uploadSource),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = ({
    isExtracting,
    projectsLoading,
    inputMode,
    description,
    uploadSource,
    extractId,
    extractedDescription,
    documentFile,
    umlCode,
  }) => {
    if (isExtracting || projectsLoading) {
      return true;
    }

    if (inputMode === 'text') {
      return !description.trim();
    }

    if (inputMode === 'upload') {
      return uploadSource === 'diagram'
        ? (!extractId || !extractedDescription.trim())
        : !documentFile;
    }

    return !umlCode.trim();
  };

  return {
    submitAnalysis,
    isSubmitDisabled,
  };
}
