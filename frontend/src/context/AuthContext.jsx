import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

function parseToken(token) {
  return JSON.parse(atob(token.split('.')[1]));
}

function getInitialState() {
  const token = localStorage.getItem('token');
  if (!token) return { token: null, user: null };
  try {
    const user = parseToken(token);
    if (user.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return { token: null, user: null };
    }
    return { token, user };
  } catch {
    // Corrupt or unrecognisable token — clear it so the app doesn't keep crashing.
    localStorage.removeItem('token');
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setAuth] = useState(getInitialState);

  useEffect(() => {
    if (!token) return;
    api.get('/auth/me')
      .then(({ data }) => {
        setAuth(prev => ({ ...prev, user: { ...prev.user, ...data.user } }));
      })
      .catch(() => {
        // Silently fall back to JWT-derived user — app remains usable
      });
  }, [token]);

  function login(newToken) {
    localStorage.setItem('token', newToken);
    setAuth({ token: newToken, user: parseToken(newToken) });
  }

  function logout() {
    localStorage.removeItem('token');
    setAuth({ token: null, user: null });
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
