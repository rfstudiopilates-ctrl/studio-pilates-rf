import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isHydrated, user } = useAuth();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="glass-card px-6 py-4 text-sm text-text-muted">Cargando sesión...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirectTo = user?.role === 'admin' ? '/admin' : '/cliente';
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isHydrated, user } = useAuth();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="glass-card px-6 py-4 text-sm text-text-muted">Cargando...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectTo = user?.role === 'admin' ? '/admin' : '/cliente';
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
