import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from '../components/ui/ToastContainer';
import Logo from '../components/ui/Logo';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, Send, Home } from 'lucide-react';
import api from '../services/api';

const REMEMBERED_EMAIL_KEY = 'dendrite_remembered_email';

const LoginPage = () => {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const { login, error, isLoading, clearError } = useAuthStore();
  const { themeMode, setThemeMode } = useSettingsStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified');

  const toast = useToast();
  const isUnverifiedError = error?.includes('verify') ?? false;
  const shownVerified = useRef(false);
  const prevError = useRef<string | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!shownVerified.current) {
      shownVerified.current = true;
      if (verified === 'true') toast.success('Email verified – you can now sign in.', 5000);
      if (verified === 'expired') toast.error('The verification link has expired.', 6000);
      if (verified === 'error') toast.error('Invalid verification link.', 6000);
    }
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      prevError.current = error;
      return;
    }
    if (error && error !== prevError.current) {
      toast.error(error, 6000);
      prevError.current = error;
    }
    if (!error) prevError.current = null;
  }, [error]);

  useEffect(() => {
    clearError();
    return () => { clearError(); };
  }, [clearError]);

  const handleResend = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResendDone(true);
    } catch {
      setResendDone(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      sessionStorage.setItem('justLoggedIn', '1');

      const pendingPlan = sessionStorage.getItem('pending_plan');
      if (pendingPlan === 'writer' || pendingPlan === 'author') {
        sessionStorage.removeItem('pending_plan');
        try {
          const { data } = await api.post('/checkout/create-session', { plan: pendingPlan });
          window.location.href = data.url;
          return;
        } catch {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } catch {
      // Error handled by store
    }
  };

  return (
    <motion.div
      className="flex min-h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      {/* Left: visual panel — desktop only */}
      <div className="hidden lg:block relative overflow-hidden" style={{ width: '55%' }}>
        <NightTransitionBackground isDark={themeMode === 'dark'} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.50) 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 z-10" style={{ padding: '56px' }}>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.28em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            Dendrite · a notebook
          </p>
          <h2 style={{
            fontFamily: 'var(--serif-display)',
            fontSize: 'clamp(42px, 4.2vw, 62px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.18,
            letterSpacing: '-0.015em',
            margin: 0,
          }}>
            Write what<br />endures.
          </h2>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 relative flex flex-col" style={{ background: 'var(--bg-deep)' }}>
        <div
          className="absolute top-0 left-0 bottom-0 hidden lg:block"
          style={{ width: '0.5px', background: 'var(--line)' }}
        />

        <Link
          to="/"
          className="absolute top-4 left-6 z-20 icon-btn-lg rounded-full flex items-center justify-center backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--surface) 55%, transparent)',
            border: '0.5px solid var(--line)',
            color: 'var(--ink-low)',
          }}
          title="Back to home"
        >
          <Home className="w-4 h-4" />
        </Link>

        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className="absolute top-4 right-6 z-20 icon-btn-lg rounded-full flex items-center justify-center backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--surface) 55%, transparent)',
            border: '0.5px solid var(--line)',
            color: 'var(--ink-low)',
          }}
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Form area */}
        <div className="relative z-10 flex-1 flex items-center justify-center" style={{ padding: '64px 40px' }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>

            {/* Logo + heading */}
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Logo
                  size="lg"
                  showText={false}
                  style={{ '--color-icon-primary': '#26ad53', '--color-icon-secondary': '#1ee85a' } as React.CSSProperties}
                />
              </div>
              <h1 style={{
                fontFamily: 'var(--serif-display)',
                fontSize: '2.3rem',
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
                margin: '18px 0 6px',
                lineHeight: 1.2,
              }}>
                Welcome back
              </h1>
              <p style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                letterSpacing: '0.22em',
                color: 'var(--ink-dim)',
                textTransform: 'uppercase',
                margin: 0,
              }}>
                Sign in to continue
              </p>
            </div>

            <div>
              {isUnverifiedError && (
                <div style={{ marginBottom: '16px' }}>
                  {resendDone ? (
                    <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#26ad53' }}>Verification email sent.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading || !email}
                      className="no-press flex items-center gap-1.5"
                      style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', background: 'none', border: 'none', cursor: 'pointer', opacity: resendLoading || !email ? 0.4 : 1 }}
                    >
                      <Send className="w-3 h-3" />
                      {resendLoading ? 'Sending...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="email" style={{
                    display: 'block',
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-low)',
                    marginBottom: '8px',
                  }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <label htmlFor="password" style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-low)',
                    }}>
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '9px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-dim)',
                        transition: 'color .15s',
                      }}
                      className="hover:text-(--accent)"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input"
                      style={{ paddingRight: '2.5rem' }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="no-press absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--ink-low)', transition: 'color .15s' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: `1.5px solid ${rememberMe ? 'var(--accent)' : 'var(--line)'}`,
                      background: rememberMe ? 'var(--accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background .15s, border-color .15s',
                    }}
                  >
                    {rememberMe && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="oklch(0.15 0.020 60)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-low)',
                  }}>
                    Remember me
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(180deg, color-mix(in oklch, var(--accent) 92%, white 5%), var(--accent-deep))',
                    color: 'oklch(0.15 0.020 60)',
                    border: 'none',
                    fontFamily: 'var(--serif-display)',
                    fontWeight: 600,
                    fontSize: '15px',
                    letterSpacing: '0.03em',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    boxShadow: '0 1px 0 color-mix(in oklch, var(--accent-hi) 60%, white 0%) inset, 0 4px 14px color-mix(in oklch, var(--accent) 25%, transparent)',
                    transition: 'transform .1s, opacity .12s',
                  }}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>

            <p style={{ marginTop: '32px', fontFamily: 'var(--serif-body)', fontSize: '14px', color: 'var(--ink-dim)', textAlign: 'center' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{ color: 'var(--accent)', transition: 'opacity .15s' }}
                className="hover:opacity-75"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
