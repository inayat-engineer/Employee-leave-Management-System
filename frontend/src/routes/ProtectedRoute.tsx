import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

type ProtectedRouteProps = {
  children: ReactNode;
  requireHr?: boolean;
};

export function ProtectedRoute({ children, requireHr = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="w-full max-w-md animate-pulse">
          <div className="h-4 w-24 rounded-full bg-surface-soft" />
          <div className="mt-4 h-8 w-3/4 rounded-xl bg-surface-soft" />
          <div className="mt-3 h-4 w-full rounded-full bg-surface-soft" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-surface-soft" />
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireHr && !user?.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
