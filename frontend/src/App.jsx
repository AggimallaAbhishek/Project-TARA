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
import { getAuthConfig } from './services/api';

const ENV_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  const [googleClientId, setGoogleClientId] = useState(ENV_GOOGLE_CLIENT_ID);
  const [authConfigLoading, setAuthConfigLoading] = useState(!ENV_GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (ENV_GOOGLE_CLIENT_ID) {
      return;
    }

    let isMounted = true;
    const loadAuthConfig = async () => {
      try {
        const config = await getAuthConfig();
        if (isMounted && config.google_client_id) {
          setGoogleClientId(config.google_client_id);
        }
      } catch (error) {
        console.error('Failed to load auth configuration:', error);
      } finally {
        if (isMounted) {
          setAuthConfigLoading(false);
        }
      }
    };

    loadAuthConfig();
    return () => {
      isMounted = false;
    };
  }, []);

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
                    element={<LoginPage isGoogleConfigured={Boolean(googleClientId)} />}
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
