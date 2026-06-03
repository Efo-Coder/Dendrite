import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from '../components/ui/ToastContainer';
import Logo from '../components/ui/Logo';
import { BetaBadge } from '../components/ui/BetaBadge';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, Send, Home, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function SocialLoginButtons() {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', width: '100%' }}>
      <a href={`${API_URL}/api/auth/google`} className="social-btn" title="Continue with Google">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
      </a>

      <a href={`${API_URL}/api/auth/github`} className="social-btn" title="Continue with GitHub">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
        </svg>
      </a>

      <a href={`${API_URL}/api/auth/microsoft`} className="social-btn" title="Continue with Microsoft">
        <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
          <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
        </svg>
      </a>
    </div>
  );
}
import api from '../services/api';
import { MagicInput } from '../components/ui/MagicInput';

const REMEMBERED_EMAIL_KEY = 'dendrite_remembered_email';

const LoginPage = () => {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { login, verifyTwoFactor, error, isLoading, clearError, requiresTwoFactor } = useAuthStore();
  const { themeMode, setThemeMode } = useSettingsStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified');
  const oauthError = searchParams.get('oauth_error');

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
      if (oauthError) toast.error(oauthError, 6000);
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
      setTimeout(() => setResendDone(false), 3000);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyTwoFactor(twoFactorCode);
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
          className="absolute top-4 left-6 z-20 icon-btn-auth fill-slide p-2.5 rounded-full flex items-center justify-center backdrop-blur-xl"
          title="Back to home"
        >
          <Home className="w-4 h-4" />
        </Link>

        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className="absolute top-4 right-6 z-20 icon-btn-auth fill-slide p-2.5 rounded-full flex items-center justify-center backdrop-blur-xl"
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Form area */}
        <div className="relative z-10 flex-1 flex items-center justify-center" style={{ padding: '64px 40px' }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>

            {requiresTwoFactor ? (
              <>
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Logo size="lg" showText={false} style={{ '--color-icon-primary': '#26ad53', '--color-icon-secondary': '#1ee85a' } as React.CSSProperties} />
                  </div>
                  <h1 style={{ fontFamily: 'var(--serif-display)', fontSize: '2.3rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--ink)', letterSpacing: '-0.01em', margin: '18px 0 6px', lineHeight: 1.2 }}>
                    Two-factor auth
                  </h1>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.22em', color: 'var(--ink-dim)', textTransform: 'uppercase', margin: 0 }}>
                    Enter the code from your authenticator app
                  </p>
                </div>

                <form onSubmit={handleTwoFactorSubmit} className="auth-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label htmlFor="twoFactorCode" style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-mid)', marginBottom: '8px' }}>
                      6-digit code
                    </label>
                    <MagicInput
                      id="twoFactorCode"
                      type="text"
                      inputMode="numeric"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input"
                      placeholder="000000"
                      required
                      autoFocus
                      style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || twoFactorCode.length < 6}
                    style={{
                      marginTop: '4px', width: '100%', padding: '11px 16px', borderRadius: '10px',
                      background: 'linear-gradient(180deg, color-mix(in oklch, var(--accent) 92%, white 5%), var(--accent-deep))',
                      color: 'oklch(0.15 0.020 60)', border: 'none',
                      fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: '15px', letterSpacing: '0.03em',
                      cursor: isLoading || twoFactorCode.length < 6 ? 'not-allowed' : 'pointer',
                      opacity: isLoading || twoFactorCode.length < 6 ? 0.6 : 1,
                      boxShadow: '0 1px 0 color-mix(in oklch, var(--accent-hi) 60%, white 0%) inset, 0 4px 14px color-mix(in oklch, var(--accent) 25%, transparent)',
                      transition: 'transform .1s, opacity .12s',
                    }}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify'}
                  </button>
                </form>
              </>
            ) : (
            <>
            {/* Logo + heading */}
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <Logo
                  size="lg"
                  showText={false}
                  style={{ '--color-icon-primary': '#26ad53', '--color-icon-secondary': '#1ee85a' } as React.CSSProperties}
                />
                <BetaBadge />
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

            <div style={{ marginBottom: '24px' }}>
              <SocialLoginButtons />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              </div>
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
                  <MagicInput
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
                  <label htmlFor="password" style={{
                    display: 'block',
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-low)',
                    marginBottom: '8px',
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MagicInput
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
                      tabIndex={-1} className="no-press absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--ink-low)', transition: 'color .15s' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Link
                    to="/forgot-password"
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      fontFamily: 'var(--serif-body)',
                      fontSize: '13px',
                    }}
                    className="text-(--ink-dim) hover:text-(--accent) transition-colors"
                  >
                    Forgot password?
                  </Link>
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
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign in'}
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
            </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginPage;


