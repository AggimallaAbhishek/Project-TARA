import { createContext, useContext, useState, useEffect } from 'react';
import { googleAuth, getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          console.log('Initializing auth with stored token...');
          const userData = await getMe();
          console.log('Auth init successful:', userData);
          setUser(userData);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth init error:', error);
          // Only clear token on 401 (invalid/expired token)
          // Don't clear on network errors or other issues
          if (error.response?.status === 401) {
            console.log('Token invalid (401), clearing auth');
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          } else {
            // Network error or other issue - keep token, retry might work
            console.log('Auth init failed but keeping token for retry');
            setToken(storedToken);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (googleCredential) => {
    const response = await googleAuth(googleCredential);
    const newToken = response.access_token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated
  };

  // Debug logging
  useEffect(() => {
    console.log('Auth state:', { user: !!user, token: !!token, isAuthenticated, loading });
  }, [user, token, isAuthenticated, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
