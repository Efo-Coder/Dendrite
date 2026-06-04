import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const MIN_LOAD_MS = 1000;

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTimerDone(true), MIN_LOAD_MS);
    return () => clearTimeout(id);
  }, []);

  if (!timerDone || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid color-mix(in oklch, var(--accent) 20%, transparent)',
            borderTopColor: 'var(--accent)',
          }}
        />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
