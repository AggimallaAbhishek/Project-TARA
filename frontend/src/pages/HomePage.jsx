import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, FolderKanban } from 'lucide-react';
import {
  analyzeDocument,
  analyzeFromDiagram,
  analyzeFromUmlCode,
  analyzeSystem,
  createProject,
  extractDiagram,
  getProjects,
} from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import { FullPageLoader } from '../components/LoadingSpinner';
import ProjectSelector from '../components/ProjectSelector';
import UploadSection from '../components/home/UploadSection';
import UmlCodeSection from '../components/home/UmlCodeSection';
import useProjectLoading from '../hooks/useProjectLoading';
import useUploadFlow from '../hooks/useUploadFlow';
import {
  DESCRIPTION_MAX_LENGTH,
  DIAGRAM_ACCEPT_TYPES,
  DOCUMENT_ACCEPT_TYPES,
  examples,
  MAX_DIAGRAM_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_BYTES,
  UML_CODE_ACCEPT_TYPES,
  UML_CODE_MAX_LENGTH,
  UML_CODE_MAX_UPLOAD_BYTES,
  UML_FORMAT_OPTIONS,
  quickActionIcons,
  strideCategories,
  TITLE_MAX_LENGTH,
} from './homePageConfig';

const { ArrowRight, Clock, History, Shield } = quickActionIcons;

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [description, setDescription] = useState('');
  const [umlFormat, setUmlFormat] = useState('mermaid');
  const [umlCode, setUmlCode] = useState('');
  const [umlFileName, setUmlFileName] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const remainingDescriptionChars = DESCRIPTION_MAX_LENGTH - description.length;
  const requestedProjectId = searchParams.get('project_id') || '';
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

  const detectUmlFormatFromFileName = (fileName) => {
    const normalizedName = (fileName || '').toLowerCase();
    if (normalizedName.endsWith('.mmd') || normalizedName.endsWith('.mermaid')) {
      return 'mermaid';
    }
    if (
      normalizedName.endsWith('.puml')
      || normalizedName.endsWith('.plantuml')
      || normalizedName.endsWith('.uml')
    ) {
      return 'plantuml';
    }
    return null;
  };

  const readTextFromFile = (file) => {
    if (file && typeof file.text === 'function') {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        resolve(typeof fileReader.result === 'string' ? fileReader.result : '');
      };
      fileReader.onerror = () => {
        reject(fileReader.error || new Error('Failed to read file'));
      };
      fileReader.readAsText(file);
    });
  };

  const handleModeChange = (mode) => {
    setInputMode(mode);
    setError(null);
    if (mode !== 'upload') {
      resetUploadState();
    }
    if (mode !== 'uml') {
      setUmlCode('');
      setUmlFormat('mermaid');
      setUmlFileName('');
    }
  };

  const handleUmlCodeFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setError(null);
    if (!file) {
      return;
    }
    if (file.size > UML_CODE_MAX_UPLOAD_BYTES) {
      setError('UML file is too large. Maximum size is 2 MB.');
      setUmlFileName('');
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('uml.file_load.start', {
        fileName: file.name,
        fileSize: file.size,
      });
    }

    try {
      const fileContent = await readTextFromFile(file);
      if (!fileContent.trim()) {
        setError('UML file is empty.');
        setUmlFileName('');
        return;
      }
      if (fileContent.length > UML_CODE_MAX_LENGTH) {
        setError(`UML code is too large. Maximum ${UML_CODE_MAX_LENGTH.toLocaleString()} characters.`);
        setUmlFileName('');
        return;
      }

      const detectedFormat = detectUmlFormatFromFileName(file.name);
      if (detectedFormat) {
        setUmlFormat(detectedFormat);
      }
      setUmlCode(fileContent);
      setUmlFileName(file.name);

      if (import.meta.env.DEV) {
        console.debug('uml.file_load.success', {
          fileName: file.name,
          detectedFormat: detectedFormat || umlFormat,
          charCount: fileContent.length,
        });
      }
    } catch (readError) {
      console.error('Failed to read UML code file:', readError);
      setError('Failed to read UML file. Please upload a UTF-8 Mermaid or PlantUML file.');
      setUmlFileName('');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Enter an analysis title before running analysis.');
      return;
    }
    if (!selectedProjectId) {
      setError('Select or create a project before running analysis.');
      return;
    }
    if (inputMode === 'text' && !description.trim()) {
      setError('Enter a system architecture description before analysis.');
      return;
    }
    if (inputMode === 'upload' && uploadSource === 'diagram' && (!extractId || !extractedDescription.trim())) {
      setError('Extract architecture from the uploaded diagram before analysis.');
      return;
    }
    if (inputMode === 'upload' && uploadSource === 'document' && !documentFile) {
      setError('Upload a document before analysis.');
      return;
    }
    if (inputMode === 'uml' && !umlCode.trim()) {
      setError('Paste UML code or attach a UML file before analysis.');
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
        operation: inputMode === 'text'
          ? 'analysis.create'
          : inputMode === 'upload'
            ? (uploadSource === 'diagram' ? 'diagram.analyze' : 'document.analyze')
            : 'diagram.analyze_code',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <FullPageLoader text="Analyzing system threats..." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-bold font-display text-text-primary mb-3">
          Threat Analysis & Risk Assessment
        </h1>
        <p className="text-text-secondary text-lg">
          Describe your system architecture and let AI identify potential security threats
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="card-dark p-6">
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

            {/* Title Input */}
            <div className="mb-5">
              <label htmlFor="analysis-title" className="block text-sm font-medium text-text-secondary mb-2">
                Analysis Title
              </label>
              <input
                id="analysis-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Healthcare Patient Portal"
                maxLength={TITLE_MAX_LENGTH}
                className="input-dark"
                required
              />
            </div>

            <div className="mb-5">
              <span className="block text-sm font-medium text-text-secondary mb-2">
                Input Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('text')}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    inputMode === 'text'
                      ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                      : 'border-dark-border text-text-secondary bg-dark-tertiary'
                  }`}
                >
                  Text Description
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('upload')}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    inputMode === 'upload'
                      ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                      : 'border-dark-border text-text-secondary bg-dark-tertiary'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('uml')}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    inputMode === 'uml'
                      ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                      : 'border-dark-border text-text-secondary bg-dark-tertiary'
                  }`}
                >
                  UML Code
                </button>
              </div>
            </div>

            {inputMode === 'text' ? (
              <div className="mb-6">
                <label htmlFor="system-description" className="block text-sm font-medium text-text-secondary mb-2">
                  System Architecture Description
                </label>
                <textarea
                  id="system-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your system's components, technologies, data flows, and security mechanisms..."
                  rows={8}
                  maxLength={DESCRIPTION_MAX_LENGTH}
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
                onUmlCodeChange={setUmlCode}
                onUmlCodeFileChange={handleUmlCodeFileChange}
                umlFormatOptions={UML_FORMAT_OPTIONS}
                umlCodeAcceptTypes={UML_CODE_ACCEPT_TYPES}
                umlCodeMaxLength={UML_CODE_MAX_LENGTH}
              />
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={
                isExtracting
                || projectsLoading
                || (
                  inputMode === 'text'
                    ? !description.trim()
                    : inputMode === 'upload'
                      ? (uploadSource === 'diagram'
                        ? (!extractId || !extractedDescription.trim())
                        : !documentFile)
                      : !umlCode.trim()
                )
              }
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

          {/* Quick Examples */}
          {inputMode === 'text' && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Quick Examples</h3>
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <motion.button
                    key={example.title}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setTitle(example.title);
                      setDescription(example.description);
                    }}
                    className="px-3 py-1.5 text-sm bg-dark-tertiary text-text-secondary rounded-lg border border-dark-border hover:border-cyber-cyan/50 hover:text-cyber-cyan transition-all"
                  >
                    {example.title}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* STRIDE Info */}
          <div className="card-dark p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyber-cyan" />
              STRIDE Model
            </h3>
            <div className="space-y-2">
              {strideCategories.map((cat) => (
                <div
                  key={cat.letter}
                  className="flex items-center gap-3 p-2 rounded-lg bg-dark-tertiary/50"
                >
                  <span className={`font-bold ${cat.color}`}>{cat.letter}</span>
                  <cat.icon className={`w-4 h-4 ${cat.color}`} />
                  <span className="text-sm text-text-secondary">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-dark p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyber-cyan" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                whileHover={{ x: 5 }}
                onClick={() => navigate('/projects')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-dark-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  View Projects
                </span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ x: 5 }}
                onClick={() => navigate('/history')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-dark-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  View History
                </span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
