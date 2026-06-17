import { Navigate, Outlet } from 'react-router-dom';
import type { GuildRole } from '../types/guild';
import { useAuth } from '../context/AuthContext';
import { hasRole, isUserActive } from '../lib/rbac';

export function ProtectedRoute({ roles }: { roles?: GuildRole[] }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading Guild OS...</div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (!isUserActive(profile)) return <Navigate to="/login" replace />; // Force logout/login if inactive
  if (roles && !hasRole(profile.role, roles)) return <Navigate to="/" replace />;
  return <Outlet />;
}
