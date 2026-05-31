import { useState } from 'react';

function detectUmlFormatFromFileName(fileName) {
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
}

function readTextFromFile(file) {
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
}

export default function useUmlCodeInput({
  maxUploadBytes,
  maxCodeLength,
  onValidationError,
  onClearError,
}) {
  const [umlFormat, setUmlFormat] = useState('mermaid');
  const [umlCode, setUmlCode] = useState('');
  const [umlFileName, setUmlFileName] = useState('');

  const resetUmlInput = () => {
    setUmlCode('');
    setUmlFormat('mermaid');
    setUmlFileName('');
  };

  const handleUmlCodeChange = (value) => {
    setUmlCode(value);
  };

  const handleUmlCodeFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    onClearError?.();

    if (!file) {
      return;
    }

    if (file.size > maxUploadBytes) {
      onValidationError?.('UML file is too large. Maximum size is 2 MB.');
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
        onValidationError?.('UML file is empty.');
        setUmlFileName('');
        return;
      }

      if (fileContent.length > maxCodeLength) {
        onValidationError?.(`UML code is too large. Maximum ${maxCodeLength.toLocaleString()} characters.`);
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
      onValidationError?.('Failed to read UML file. Please upload a UTF-8 Mermaid or PlantUML file.');
      setUmlFileName('');
    } finally {
      event.target.value = '';
    }
  };

  return {
    umlFormat,
    umlCode,
    umlFileName,
    setUmlFormat,
    handleUmlCodeChange,
    handleUmlCodeFileChange,
    resetUmlInput,
  };
}
