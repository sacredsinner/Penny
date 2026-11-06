import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('penny_token'));
  const [loading, setLoading] = useState(true);
  const [activeCurrency, setActiveCurrency] = useState('USD');

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.auth.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Failed to load user with token, clearing token:', err.message);
        localStorage.removeItem('penny_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('penny_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (email, password, name) => {
    const res = await api.auth.register(email, password, name);
    localStorage.setItem('penny_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('penny_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      setUser(res.user);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      activeCurrency,
      setActiveCurrency
    }}>
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
