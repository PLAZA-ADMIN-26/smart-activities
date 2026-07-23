import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

// Utenti autorizzati (controllo locale, come richiesto)
const AUTHORIZED_USERS = {
  MIRKO: 'Plaza2026',
  ADMIN: 'Plaza2026'
};

const SESSION_KEY = 'plaza_session';
const MAX_INACTIVITY_MS = 12 * 60 * 60 * 1000; // 12 ore

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        const inactiveFor = Date.now() - session.lastActive;
        if (inactiveFor < MAX_INACTIVITY_MS) {
          setUser(session.user);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setReady(true);
  }, []);

  // Aggiorna il timestamp di attività a ogni interazione
  useEffect(() => {
    if (!user) return;
    const touch = () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user, lastActive: Date.now() }));
    };
    touch();
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, touch));
    return () => events.forEach((e) => window.removeEventListener(e, touch));
  }, [user]);

  const login = useCallback((username, password) => {
    const uname = username.trim().toUpperCase();
    if (AUTHORIZED_USERS[uname] && AUTHORIZED_USERS[uname] === password) {
      setUser(uname);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: uname, lastActive: Date.now() }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return ctx;
}
