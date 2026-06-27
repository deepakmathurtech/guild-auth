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
  // Still loading - show loading state
  if (loading) return <div className="center-screen">Loading Guild OS...</div>;
  // No profile (logged out, session expired, or deleted user) - go to login
  if (!profile) return <Navigate to="/login" replace />;
  // User is inactive - force re-login
  if (!isUserActive(profile)) return <Navigate to="/login" replace />;
  // Role check
  if (roles && !hasRole(profile.role, roles)) return <Navigate to="/" replace />;
  return children ? <>{children}</> : <Outlet />;
}
