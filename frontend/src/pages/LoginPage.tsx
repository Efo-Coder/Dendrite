import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import Logo from '../components/ui/Logo';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, CheckCircle, AlertCircle, Send, Home } from 'lucide-react';
import api from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const { login, error, isLoading } = useAuthStore();
  const { themeMode, setThemeMode } = useSettingsStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified');

  const isUnverifiedError = error?.includes('verify') ?? false;

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
        {/* Editorial text */}
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
        {/* Panel separator */}
        <div
          className="absolute top-0 left-0 bottom-0 hidden lg:block"
          style={{ width: '0.5px', background: 'var(--line)' }}
        />

        {/* Home button */}
        <Link
          to="/"
          className="absolute top-4 left-6 z-20 icon-btn-lg rounded-full flex items-center justify-center backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--surface) 55%, transparent)',
            border: '0.5px solid var(--line)',
            color: 'var(--ink-mid)',
          }}
          title="Back to home"
        >
          <Home className="w-4 h-4" />
        </Link>

        {/* Theme toggle */}
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
          className="absolute top-4 right-6 z-20 icon-btn-lg rounded-full flex items-center justify-center backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--surface) 55%, transparent)',
            border: '0.5px solid var(--line)',
            color: 'var(--ink-mid)',
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

            {/* Alerts */}
            {(verified === 'true' || verified === 'expired' || verified === 'error' || error) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {verified === 'true' && (
                  <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Email verified – you can now sign in.
                  </div>
                )}
                {(verified === 'expired' || verified === 'error') && (
                  <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {verified === 'expired' ? 'The verification link has expired.' : 'Invalid verification link.'}
                  </div>
                )}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm space-y-2">
                    <p>{error}</p>
                    {isUnverifiedError && (
                      resendDone ? (
                        <p className="text-green-400 text-xs">Verification email sent.</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resendLoading || !email}
                          className="no-press flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors disabled:opacity-40"
                        >
                          <Send className="w-3 h-3" />
                          {resendLoading ? 'Sending...' : 'Resend verification email'}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-mid)',
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
                <label htmlFor="password" style={{
                  display: 'block',
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-mid)',
                  marginBottom: '8px',
                }}>
                  Password
                </label>
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
