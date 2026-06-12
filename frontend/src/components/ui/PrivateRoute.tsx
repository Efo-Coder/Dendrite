import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { DendriteBranch } from './DendriteBranch';

// 1.4s statt 1s — so läuft die Zweig-Choreografie (Äste + Punkte) einmal komplett durch
const MIN_LOAD_MS = 1400;

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
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--bg)', gap: '26px' }}
      >
        <DendriteBranch style={{ width: 'min(320px, 72vw)' }} />
        <p
          className="animate-fade-in"
          style={{
            margin: 0,
            fontFamily: 'var(--serif-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '22px',
            letterSpacing: '0.01em',
            color: 'var(--ink-mid)',
            animationDelay: '0.5s',
            animationDuration: '0.8s',
            animationFillMode: 'backwards',
          }}
        >
          Dendrite
        </p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
