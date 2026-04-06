import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleSuccess = async (credentialResponse) => {
    try {
      await login(credentialResponse.credential);
      navigate('/');
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    }
  };

  const handleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <span className="text-5xl">🛡️</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome to TARA</h1>
          <p className="text-gray-600 mt-2">
            Threat Analysis & Risk Assessment
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-4">
            Sign in with your Google account to continue
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">What you can do:</h3>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Analyze system architectures for threats
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Get STRIDE-based threat classification
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              View risk scores and mitigations
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Save and review analysis history
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
