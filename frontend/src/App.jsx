import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { runtimeConfig } from './config/runtimeConfig';
import { getAuthConfig } from './services/api';
import { resolveGoogleClientId } from './services/authConfig';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RootEntryRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Checking authentication..." />
      </div>
    );
  }

  return isAuthenticated ? <HomePage /> : <LandingPage />;
}

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
      <div className="app-shell flex items-center justify-center px-4">
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
      <div className="app-shell flex items-center justify-center">
        <LoadingSpinner text="Loading authentication configuration..." />
      </div>
    );
  }

  if (!googleClientId && import.meta.env.DEV && import.meta.env.VITE_E2E !== 'true') {
    console.warn('Google Client ID not configured. Google login will not work.');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-shell">
            <Navbar />
            <main className="page-container">
              <Suspense fallback={<LoadingSpinner text="Loading page..." />}>
                <Routes>
                  <Route path="/welcome" element={<Navigate to="/" replace />} />
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
                  <Route path="/" element={<RootEntryRoute />} />
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
                  <Route path="/audit" element={
                    <ProtectedRoute>
                      <AuditPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/projects" element={
                    <ProtectedRoute>
                      <ProjectsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/projects/:projectId" element={
                    <ProtectedRoute>
                      <ProjectDetailPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/compare" element={
                    <ProtectedRoute>
                      <ComparePage />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
