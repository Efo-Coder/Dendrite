import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/ToastContainer';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuthStore();
  const toast = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get('token');
    const oauthError = searchParams.get('oauth_error');

    if (oauthError) {
      toast.error(oauthError, 6000);
      navigate('/login', { replace: true });
      return;
    }

    if (!token) {
      toast.error('Login failed. Please try again.', 6000);
      navigate('/login', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => {
        sessionStorage.setItem('justLoggedIn', '1');
        const pendingPlan = sessionStorage.getItem('pending_plan');
        if (pendingPlan === 'writer' || pendingPlan === 'author') {
          sessionStorage.removeItem('pending_plan');
          import('../services/api').then(({ default: api }) => {
            api.post('/checkout/create-session', { plan: pendingPlan })
              .then(({ data }) => { window.location.href = data.url; })
              .catch(() => navigate('/dashboard', { replace: true }));
          });
        } else {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {
        toast.error('Login failed. Please try again.', 6000);
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-deep)',
      }}
    >
      <p style={{
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink-dim)',
      }}>
        Signing in…
      </p>
    </div>
  );
};

export default OAuthCallbackPage;
