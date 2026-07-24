import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedLayout from './components/ProtectedLayout';
import NotificationWatcher from './components/NotificationWatcher';
import Login from './pages/Login';
import Home from './pages/Home';
import Notes from './pages/Notes';
import CalendarPage from './pages/Calendar';
import Countdown from './pages/Countdown';
import Settings from './pages/Settings';

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <NotificationWatcher />
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/note" element={<Notes />} />
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/countdown" element={<Countdown />} />
                <Route path="/impostazioni" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
