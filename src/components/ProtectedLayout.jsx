import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import QuickActionButton from './QuickActionButton';

export default function ProtectedLayout() {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-dvh pb-20">
      <TopBar />
      <Outlet />
      <QuickActionButton />
      <BottomNav />
    </div>
  );
}
