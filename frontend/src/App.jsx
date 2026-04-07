import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-google-client-id';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-dark-primary bg-cyber-pattern">
            <Navbar />
            <AnimatePresence mode="wait">
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                  <Route path="/welcome" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
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
