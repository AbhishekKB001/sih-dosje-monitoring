import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3 text-slate-soft">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-ochre" />
          <p className="text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
