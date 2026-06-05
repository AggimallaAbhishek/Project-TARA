import {
  analyzeDocumentJob,
  analyzeFromDiagramJob,
  analyzeFromUmlCodeJob,
  analyzeSystemJob,
  getAnalysisJob,
} from '../services/api';

const JOB_POLL_INTERVAL_MS = 1000;
const JOB_MAX_POLLS = 600;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

function getReadinessError(modelReadiness) {
  if (!modelReadiness) {
    return null;
  }
  if (!modelReadiness.text?.available) {
    return modelReadiness.text?.error || 'The configured Ollama text model is unavailable.';
  }
  return null;
}

async function waitForAnalysisJob(job, onProgress) {
  let currentJob = job;
  for (let attempt = 0; attempt < JOB_MAX_POLLS; attempt += 1) {
    onProgress?.(currentJob);
    if (currentJob.status === 'succeeded') {
      if (!currentJob.analysis_id) {
        throw new Error('Completed analysis job is missing analysis ID');
      }
      return currentJob.analysis_id;
    }
    if (currentJob.status === 'failed') {
      throw new Error(currentJob.error || 'Analysis job failed.');
    }
    await sleep(JOB_POLL_INTERVAL_MS);
    currentJob = await getAnalysisJob(currentJob.job_id);
  }
  throw new Error('Analysis job timed out while waiting for completion.');
}

export default function useAnalysisSubmission({
  navigate,
  getApiErrorMessage,
  setError,
  setIsLoading,
  setLoadingMessage,
  modelReadiness,
}) {
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

    const readinessError = getReadinessError(modelReadiness);
    if (readinessError) {
      setError(readinessError);
      return;
    }

    setIsLoading(true);
    setLoadingMessage?.('Queueing analysis job...');
    setError(null);

    try {
      const projectOptions = { projectId: Number(selectedProjectId) };
      const result = inputMode === 'text'
        ? await analyzeSystemJob(title, description, projectOptions)
        : inputMode === 'upload'
          ? (uploadSource === 'diagram'
            ? await analyzeFromDiagramJob(title, extractId, extractedDescription, projectOptions)
            : await analyzeDocumentJob(title, documentFile, projectOptions))
          : await analyzeFromUmlCodeJob(title, umlFormat, umlCode, projectOptions);

      const analysisId = await waitForAnalysisJob(result, (job) => {
        const progress = Number(job.progress_percent || 0).toFixed(0);
        const stage = String(job.stage || 'running').replace(/_/g, ' ');
        setLoadingMessage?.(`Analyzing threats: ${progress}% (${stage})`);
      });

      navigate(`/analysis/${analysisId}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(getApiErrorMessage(err, {
        fallbackMessage: 'Failed to analyze system. Please check if the backend is running.',
        operation: getOperationForMode(inputMode, uploadSource),
      }));
    } finally {
      setIsLoading(false);
      setLoadingMessage?.('Analyzing system threats...');
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

    if (getReadinessError(modelReadiness)) {
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
