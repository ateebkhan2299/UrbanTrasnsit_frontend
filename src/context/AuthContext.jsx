import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'transit_token';
const USER_KEY = 'transit_user';

// NOTE: the previous build fell back to a hard-coded admin user whenever
// localStorage was empty, so `user` was never null on a cold load and the
// route guard in Shell.jsx could never redirect to /login. Authentication is
// now derived strictly from the persisted session and re-validated against
// GET /api/auth/me on boot.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    return t && t !== 'null' && t !== 'undefined' ? t : null;
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored && stored !== 'null' && stored !== 'undefined') return JSON.parse(stored);
    } catch {
      /* corrupted payload -> treat as logged out */
    }
    return null;
  });

  const [checking, setChecking] = useState(Boolean(token));

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // Re-validate the stored token once on mount; an expired or tampered token
  // clears the session instead of leaving the UI in a half-authenticated state.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setChecking(false);
      return undefined;
    }
    (async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (!cancelled) setUser(res.data);
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async ({ username, password }) => {
    const res = await apiClient.post('/auth/login', { username, password });
    const data = res.data;
    const userData = data.user || {
      username,
      role: data.role || 'Analyst',
      email: data.email || '',
    };
    setToken(data.access_token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const hasRole = useCallback(
    (...roles) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const value = useMemo(
    () => ({ user, token, login, logout, hasRole, isAuthenticated: Boolean(user && token), checking }),
    [user, token, login, logout, hasRole, checking],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
