import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireEditor?: boolean;
  requireLeader?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requireAdmin = false,
  requireEditor = false,
  requireLeader = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, isEditor, isLeader, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireEditor && !isEditor) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireLeader && !isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
