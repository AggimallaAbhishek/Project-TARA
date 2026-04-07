import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { runtimeConfig } from './config/runtimeConfig';
import { getAuthConfig } from './services/api';
import { resolveGoogleClientId } from './services/authConfig';

function App() {
  const [googleClientId, setGoogleClientId] = useState('');
  const [authConfigLoading, setAuthConfigLoading] = useState(
    runtimeConfig.startupConfigErrors.length === 0,
  );

  useEffect(() => {
    let isMounted = true;

    const loadAuthConfig = async () => {
      const resolvedClientId = await resolveGoogleClientId(
        runtimeConfig.envGoogleClientId,
        getAuthConfig,
      );
      if (isMounted) {
        setGoogleClientId(resolvedClientId);
      }
      if (isMounted) {
        setAuthConfigLoading(false);
      }
    };

    if (runtimeConfig.startupConfigErrors.length > 0) {
      return () => {
        isMounted = false;
      };
    }

    loadAuthConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  if (runtimeConfig.startupConfigErrors.length > 0) {
    return (
      <div className="min-h-screen bg-dark-primary bg-cyber-pattern flex items-center justify-center px-4">
        <div className="card-dark p-8 max-w-xl w-full border border-risk-critical/30">
          <h1 className="text-2xl font-bold font-display text-text-primary mb-3">
            Startup Configuration Error
          </h1>
          <p className="text-text-secondary mb-4">
            Required frontend environment variables are missing:
          </p>
          <ul className="list-disc list-inside text-risk-critical text-sm space-y-1 mb-4">
            {runtimeConfig.startupConfigErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <p className="text-text-muted text-sm">
            Add missing values to <code>frontend/.env</code> and restart the frontend dev server.
          </p>
        </div>
      </div>
    );
  }

  if (authConfigLoading) {
    return (
      <div className="min-h-screen bg-dark-primary bg-cyber-pattern flex items-center justify-center">
        <LoadingSpinner text="Loading authentication configuration..." />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || 'missing-google-client-id'}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-dark-primary bg-cyber-pattern">
            <Navbar />
            <AnimatePresence mode="wait">
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                  <Route path="/welcome" element={<LandingPage />} />
                  <Route
                    path="/login"
                    element={
                      <LoginPage
                        isGoogleConfigured={Boolean(googleClientId)}
                        googleConfigSource={
                          runtimeConfig.envGoogleClientId ? 'frontend-env' : 'backend-config'
                        }
                      />
                    }
                  />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/analysis/:id" element={
                    <ProtectedRoute>
                      <AnalysisPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/history" element={
                    <ProtectedRoute>
                      <HistoryPage />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
            </AnimatePresence>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
