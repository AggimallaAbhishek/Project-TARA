import { createContext, useContext, useState, useEffect } from 'react';
import { googleAuth, getMe, logoutRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await getMe();
        setUser(userData);
      } catch (error) {
        // 401 is expected when no active cookie exists.
        if (error.response?.status !== 401) {
          console.error('Auth init error:', error);
        }
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (googleCredential) => {
    const response = await googleAuth(googleCredential);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    setUser(null);
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
