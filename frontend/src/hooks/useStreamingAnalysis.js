import { useState, useCallback } from 'react';
import { __apiInternal } from '../services/api';

export function useStreamingAnalysis() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [threats, setThreats] = useState([]);
  const [analysisId, setAnalysisId] = useState(null);
  const [error, setError] = useState(null);

  const startStream = useCallback(
    (payload) => {
      setIsStreaming(true);
      setStatusMessage('Initializing...');
      setThreats([]);
      setAnalysisId(null);
      setError(null);

      const baseUrl = __apiInternal.getActiveApiBaseUrl();
      const url = `${baseUrl}/analyze/stream`;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (!response.ok) {
            let errorMsg = 'Failed to start analysis';
            try {
              const data = await response.json();
              errorMsg = data.detail || errorMsg;
            } catch (e) {
              // ignore
            }
            throw new Error(errorMsg);
          }
          
          if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          const readChunk = async () => {
            const { done, value } = await reader.read();
            if (done) {
              setIsStreaming(false);
              return;
            }
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last partial line in the buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  if (eventData.event === 'status') {
                    setStatusMessage(eventData.data.message);
                  } else if (eventData.event === 'threat') {
                    setThreats((prev) => [...prev, eventData.data]);
                  } else if (eventData.event === 'complete') {
                    setStatusMessage('Analysis complete. Saving...');
                  } else if (eventData.event === 'saved') {
                    setAnalysisId(eventData.data.analysis_id);
                    setIsStreaming(false);
                  } else if (eventData.event === 'error') {
                    throw new Error(eventData.data.message);
                  }
                } catch (err) {
                  console.error('Error parsing SSE event:', err);
                }
              }
            }
            
            readChunk();
          };

          readChunk().catch((err) => {
            setError(err.message);
            setIsStreaming(false);
          });
        })
        .catch((err) => {
          setError(err.message);
          setIsStreaming(false);
        });
    },
    []
  );

  return {
    startStream,
    isStreaming,
    statusMessage,
    threats,
    analysisId,
    error,
  };
}
