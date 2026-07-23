import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { loadUserData, saveUserData } from '../utils/storage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('auto'); // 'light' | 'dark' | 'auto'

  useEffect(() => {
    if (!user) return;
    const settings = loadUserData(user, 'settings', {});
    setMode(settings.theme || 'auto');
  }, [user]);

  useEffect(() => {
    const apply = () => {
      let dark = mode === 'dark';
      if (mode === 'auto') {
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  const updateMode = (newMode) => {
    setMode(newMode);
    if (user) {
      const settings = loadUserData(user, 'settings', {});
      saveUserData(user, 'settings', { ...settings, theme: newMode });
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode: updateMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve essere usato dentro ThemeProvider');
  return ctx;
}
