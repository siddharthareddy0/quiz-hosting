import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { adminAuthApi } from '../services/adminAuthApi.js';

const AdminAuthContext = createContext(null);

function getStoredToken() {
  return localStorage.getItem('qh_admin_token');
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('qh_admin_token');
    setToken(null);
    setAdmin(null);
  }, []);

  const setSession = useCallback((nextToken, nextAdmin) => {
    localStorage.setItem('qh_admin_token', nextToken);
    setToken(nextToken);
    setAdmin(nextAdmin);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const { admin: me } = await adminAuthApi.me(token);
      setAdmin(me);
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
      admin,
      loading,
      isAuthed: Boolean(token && admin),
      setSession,
      logout,
      refreshMe,
    }),
    [token, admin, loading, setSession, logout, refreshMe]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
