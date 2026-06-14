import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';

export default function CheckoutSuccessPage() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    sessionStorage.removeItem('pending_plan');
    loadUser();
  }, [loadUser]);

  return (
    <motion.div
      className="flex min-h-dvh items-center justify-center"
      style={{ background: 'var(--bg-deep)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ textAlign: 'center', maxWidth: '420px', padding: '40px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'rgba(38,173,83,0.12)',
          border: '0.5px solid rgba(38,173,83,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#26ad53" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'var(--serif-display)',
          fontSize: '2.2rem',
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          You're all set.
        </h1>

        <p style={{
          fontFamily: 'var(--serif-body)',
          fontSize: '15px',
          color: 'var(--ink-low)',
          lineHeight: 1.65,
          margin: '0 0 32px',
        }}>
          Your subscription is active. Welcome to your new plan —<br />
          everything is ready in your dashboard.
        </p>

        <Link
          to="/dashboard"
          className="btn primary"
          style={{ padding: '11px 28px', borderRadius: '10px', fontSize: '15px' }}
        >
          Go to Dashboard
        </Link>
      </div>
    </motion.div>
  );
}
