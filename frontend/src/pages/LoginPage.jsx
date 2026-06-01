import { GoogleLogin } from '@react-oauth/google';
import { Navigate, useNavigate } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { Shield, Zap, Target, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getBackendHealth } from '../services/api';
import { getApiErrorMessage } from '../services/apiError';
import {
  clearGoogleLoginCallbacks,
  dispatchGoogleLoginError,
  dispatchGoogleLoginSuccess,
  registerGoogleLoginCallbacks,
} from '../services/googleLoginCallbacks';

export default function LoginPage({ isGoogleConfigured = false, googleConfigSource = 'frontend-env' }) {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [backendError, setBackendError] = useState('');
  const [isGoogleWidgetReady, setIsGoogleWidgetReady] = useState(false);
  const shouldRedirect = !loading && isAuthenticated;

  const probeBackendReachability = async () => {
    setIsCheckingBackend(true);
    setBackendError('');
    try {
      await getBackendHealth();
      setIsBackendReachable(true);
    } catch (probeError) {
      setIsBackendReachable(false);
      setBackendError(
        getApiErrorMessage(probeError, {
          fallbackMessage:
            'Cannot reach backend auth API. Start backend and verify /health is reachable.',
          operation: 'auth.health_probe',
        }),
      );
    } finally {
      setIsCheckingBackend(false);
    }
  };

  useEffect(() => {
    if (shouldRedirect) {
      return;
    }
    probeBackendReachability();
  }, [shouldRedirect]);

  const handleSuccess = useCallback(async (credentialResponse) => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await login(credentialResponse.credential);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        getApiErrorMessage(err, {
          fallbackMessage: 'Login failed. Please try again.',
          operation: 'auth.login',
        }),
      );
      console.error('Login error:', err);
      setIsLoggingIn(false);
    }
  }, [login, navigate]);

  const handleError = useCallback(() => {
    setError('Google login failed. Please try again.');
  }, []);

  useEffect(() => {
    registerGoogleLoginCallbacks({
      onSuccess: handleSuccess,
      onError: handleError,
    });
    return () => {
      clearGoogleLoginCallbacks();
    };
  }, [handleError, handleSuccess]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsGoogleWidgetReady(true);
      if (import.meta.env.DEV) {
        console.debug('auth.google_widget.ready');
      }
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  // Redirect if already logged in
  if (shouldRedirect) {
    return <Navigate to="/" replace />;
  }

  const features = [
    { icon: Zap, text: 'AI-powered threat analysis' },
    { icon: Target, text: 'STRIDE methodology' },
    { icon: Shield, text: 'Risk scoring & assessment' },
    { icon: Lock, text: 'Mitigation recommendations' },
  ];

  if (loading || isLoggingIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <LoadingSpinner text={isLoggingIn ? 'Signing you in...' : 'Loading...'} />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="ui-panel max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-xl bg-dark-tertiary border border-dark-border-strong"
          >
            <Shield className="w-8 h-8 text-cyber-cyan" />
          </motion.div>
          
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Welcome to TARA
          </h1>
          <p className="text-text-secondary mt-2 text-sm">
            Secure sign-in for threat analysis workspace access
          </p>
        </div>

        {/* Google Login */}
        <div className="mb-8">
          <p className="text-sm text-text-muted text-center mb-4">
            Sign in with your Google account to continue
          </p>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-risk-critical text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="flex justify-center">
            {isGoogleConfigured ? (
              isCheckingBackend ? (
                <div className="w-full max-w-[300px] p-3 bg-dark-tertiary border border-dark-border rounded-lg text-sm text-text-secondary text-center">
                  Checking backend connectivity...
                </div>
              ) : isBackendReachable ? (
                isGoogleWidgetReady ? (
                  <GoogleLogin
                    onSuccess={dispatchGoogleLoginSuccess}
                    onError={dispatchGoogleLoginError}
                    useOneTap={false}
                    auto_select={false}
                    use_fedcm_for_button={false}
                    context="signin"
                    type="standard"
                    theme="filled_black"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="300"
                  />
                ) : (
                  <div className="w-full max-w-[300px] p-3 bg-dark-tertiary border border-dark-border rounded-lg text-sm text-text-secondary text-center">
                    Preparing sign-in...
                  </div>
                )
              ) : (
                <div className="w-full max-w-[300px] space-y-3">
                  <div className="p-3 bg-risk-critical/10 border border-risk-critical/30 rounded-lg text-sm text-risk-critical">
                    {backendError || 'Backend is unreachable. Check backend service health and try again.'}
                  </div>
                  <button
                    type="button"
                    onClick={probeBackendReachability}
                    className="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-tertiary text-text-secondary text-sm hover:text-text-primary hover:border-cyber-cyan/40 transition-colors"
                  >
                    Retry Backend Check
                  </button>
                </div>
              )
            ) : (
              <div className="w-full max-w-[300px] p-3 bg-risk-medium/10 border border-risk-medium/30 rounded-lg text-sm text-risk-medium">
                Google login is not configured.
                {googleConfigSource === 'backend-config' ? (
                  <> Set <code>GOOGLE_CLIENT_ID</code> in backend env.</>
                ) : (
                  <> Set <code>VITE_GOOGLE_CLIENT_ID</code> in frontend env.</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="border-t border-dark-border pt-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4 text-center">
            What you can do
          </h3>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3 text-sm text-text-primary"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyber-cyan/10">
                  <feature.icon className="w-3.5 h-3.5 text-cyber-cyan" />
                </span>
                {feature.text}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
