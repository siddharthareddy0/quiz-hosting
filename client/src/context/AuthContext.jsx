import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../services/authApi.js';

const AuthContext = createContext(null);

function getStoredToken() {
  return localStorage.getItem('qh_token');
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('qh_token');
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem('qh_token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { user: me } = await authApi.me(token);
      setUser(me);
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthed: Boolean(token && user),
      setSession,
      logout,
      refreshMe,
    }),
    [token, user, loading, setSession, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
