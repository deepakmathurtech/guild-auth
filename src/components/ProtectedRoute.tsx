import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { GuildRole } from '../types/guild';
import { useAuth } from '../context/AuthContext';
import { hasRole, isUserActive } from '../lib/rbac';

interface ProtectedRouteProps {
  roles?: GuildRole[];
  children?: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading Guild OS...</div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (!isUserActive(profile)) return <Navigate to="/login" replace />; // Force logout/login if inactive
  if (roles && !hasRole(profile.role, roles)) return <Navigate to="/" replace />;
  return children ? <>{children}</> : <Outlet />;
}
