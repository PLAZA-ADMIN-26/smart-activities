import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';

export default function ProtectedLayout() {
  const { user, ready } = useAuth();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
