import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SystemInputForm from '../components/SystemInputForm';
import { analyzeSystem } from '../services/api';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (title, description) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await analyzeSystem(title, description);
      navigate(`/analysis/${result.id}`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to analyze system. Please check if the backend is running and your API key is configured.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Threat Analysis & Risk Assessment
        </h1>
        <p className="text-gray-600">
          Describe your system architecture and let AI identify potential security threats using the STRIDE methodology.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <SystemInputForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      <div className="mt-8 bg-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-3">About STRIDE</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white rounded p-3">
            <span className="font-medium text-purple-700">S</span>
            <span className="text-gray-600"> - Spoofing</span>
          </div>
          <div className="bg-white rounded p-3">
            <span className="font-medium text-blue-700">T</span>
            <span className="text-gray-600"> - Tampering</span>
          </div>
          <div className="bg-white rounded p-3">
            <span className="font-medium text-pink-700">R</span>
            <span className="text-gray-600"> - Repudiation</span>
          </div>
          <div className="bg-white rounded p-3">
            <span className="font-medium text-cyan-700">I</span>
            <span className="text-gray-600"> - Info Disclosure</span>
          </div>
          <div className="bg-white rounded p-3">
            <span className="font-medium text-amber-700">D</span>
            <span className="text-gray-600"> - Denial of Service</span>
          </div>
          <div className="bg-white rounded p-3">
            <span className="font-medium text-red-700">E</span>
            <span className="text-gray-600"> - Elevation of Privilege</span>
          </div>
        </div>
      </div>
    </div>
  );
}
