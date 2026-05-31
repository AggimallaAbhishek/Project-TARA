import { useCallback, useState } from 'react';

/**
 * Handles diagram/document upload state and extraction workflow.
 */
export default function useUploadFlow({
  extractDiagram,
  getApiErrorMessage,
  maxDiagramUploadBytes,
  maxDocumentUploadBytes,
  setError,
}) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSource, setUploadSource] = useState('diagram');
  const [diagramFile, setDiagramFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [extractId, setExtractId] = useState('');
  const [extractedDescription, setExtractedDescription] = useState('');
  const [sourceMetadata, setSourceMetadata] = useState(null);

  const resetExtractedState = useCallback(() => {
    setExtractId('');
    setExtractedDescription('');
    setSourceMetadata(null);
  }, []);

  const resetUploadState = useCallback(() => {
    setDiagramFile(null);
    setDocumentFile(null);
    resetExtractedState();
    setUploadSource('diagram');
  }, [resetExtractedState]);

  const handleUploadSourceChange = useCallback((source) => {
    setUploadSource(source);
    setError(null);
    if (source === 'diagram') {
      setDocumentFile(null);
      return;
    }
    setDiagramFile(null);
    resetExtractedState();
  }, [resetExtractedState, setError]);

  const handleDiagramFileChange = useCallback((event) => {
    const file = event.target.files?.[0] || null;
    setError(null);
    setDiagramFile(null);
    resetExtractedState();

    if (!file) return;
    if (file.size > maxDiagramUploadBytes) {
      setError('Diagram file is too large. Maximum size is 10 MB.');
      return;
    }
    setDiagramFile(file);
  }, [maxDiagramUploadBytes, resetExtractedState, setError]);

  const handleExtractDiagram = useCallback(async ({ title }) => {
    if (!diagramFile || !title.trim()) return;
    setError(null);
    setIsExtracting(true);
    try {
      const extracted = await extractDiagram(diagramFile);
      setExtractId(extracted.extract_id);
      setExtractedDescription(extracted.extracted_system_description || '');
      setSourceMetadata(extracted.source_metadata || null);
    } catch (err) {
      console.error('Diagram extraction failed:', err);
      setError(getApiErrorMessage(err, {
        fallbackMessage: 'Failed to extract architecture from diagram. Please try another file.',
        operation: 'diagram.extract',
      }));
    } finally {
      setIsExtracting(false);
    }
  }, [diagramFile, extractDiagram, getApiErrorMessage, setError]);

  const handleDocumentFileChange = useCallback((event) => {
    const file = event.target.files?.[0] || null;
    setError(null);
    setDocumentFile(null);

    if (!file) return;
    if (file.size > maxDocumentUploadBytes) {
      setError('Document file is too large. Maximum size is 10 MB.');
      return;
    }
    setDocumentFile(file);
  }, [maxDocumentUploadBytes, setError]);

  return {
    isExtracting,
    uploadSource,
    diagramFile,
    documentFile,
    extractId,
    extractedDescription,
    sourceMetadata,
    setExtractedDescription,
    setUploadSource,
    resetExtractedState,
    resetUploadState,
    handleUploadSourceChange,
    handleDiagramFileChange,
    handleExtractDiagram,
    handleDocumentFileChange,
  };
}
