import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from '../components/ui/ToastContainer';
import Logo from '../components/ui/Logo';
import { BetaBadge } from '../components/ui/BetaBadge';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, Mail, Home } from 'lucide-react';

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

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: 'transparent' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isLong = password.length >= 12;
  const score = (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0) + (isLong ? 1 : 0);
  if (password.length < 8) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { level: 2, label: 'Medium', color: '#f59e0b' };
  return { level: 3, label: 'Strong', color: '#26ad53' };
}

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [localError, setLocalError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const { register, error, isLoading, clearError } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const prevError = useRef<string | null>(null);
  const isMounted = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const plan = sessionStorage.getItem('pending_plan');
    if (plan === 'writer' || plan === 'author') setPendingPlan(plan);
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      prevError.current = localError || error;
      return;
    }
    const msg = localError || error;
    if (msg && msg !== prevError.current) {
      toast.error(msg, 6000);
      prevError.current = msg;
    }
    if (!msg) prevError.current = null;
  }, [localError, error]);

  useEffect(() => {
    clearError();
    return () => { clearError(); };
  }, [clearError]);

  const { themeMode, setThemeMode } = useSettingsStore();

  const strength = getPasswordStrength(password);
  const confirmMismatch = confirmTouched && confirmPassword !== '' && confirmPassword !== password;

  useEffect(() => {
    if (!emailSent || !email) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/auth/check-verified?email=${encodeURIComponent(email)}`);
        if (res.data.verified) {
          clearInterval(pollRef.current!);
          navigate('/login?verified=true');
        }
      } catch {}
    }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [emailSent, email, navigate]);

  const handleResend = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendDone(false);
    await Promise.allSettled([
      api.post('/auth/resend-verification', { email }),
      new Promise(res => setTimeout(res, 1200)),
    ]);
    setResendLoading(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return;
    }
    try {
      await register(email, password, name);
      setEmailSent(true);
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

            <AnimatePresence mode="wait" initial={false}>
            {emailSent ? (
              /* Success state */
              <motion.div
                key="email-sent"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
              >
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(38,173,83,0.12)',
                  border: '0.5px solid rgba(38,173,83,0.3)',
                }}>
                  <Mail className="w-6 h-6" style={{ color: '#26ad53' }} />
                </div>
                <h1 style={{
                  fontFamily: 'var(--serif-display)',
                  fontSize: '2rem',
                  fontWeight: 400,
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}>
                  Email sent
                </h1>
                <p style={{ fontFamily: 'var(--serif-body)', fontSize: '14px', color: 'var(--ink-low)', lineHeight: 1.65, margin: 0 }}>
                  We sent a verification email to{' '}
                  <span style={{ color: 'var(--ink-low)', fontWeight: 500 }}>{email}</span>.{' '}
                  Click the link to complete your registration.
                </p>
                <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.16em', color: 'var(--ink-dim)', textTransform: 'uppercase', margin: 0 }}>
                  Link valid for 24 hours
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '8px', minHeight: '24px', justifyContent: 'center' }}>
                  <AnimatePresence mode="wait" initial={false}>
                    {resendDone ? (
                      <motion.p
                        key="done"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        style={{ fontFamily: 'var(--serif-body)', fontSize: '14px', color: '#26ad53', margin: 0 }}
                      >
                        Verification email sent.
                      </motion.p>
                    ) : (
                      <motion.button
                        key="btn"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading}
                        className={`no-press hover:opacity-75 transition-opacity ${resendLoading ? 'opacity-50' : 'opacity-100'}`}
                        style={{
                          fontFamily: 'var(--serif-body)',
                          fontSize: '14px',
                          color: 'var(--accent)',
                          background: 'none',
                          border: 'none',
                          cursor: resendLoading ? 'default' : 'pointer',
                        }}
                      >
                        {resendLoading ? 'Sending…' : 'Resend email'}
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <Link
                    to="/login"
                    style={{ color: 'var(--accent)', fontFamily: 'var(--serif-body)', fontSize: '14px', transition: 'opacity .15s' }}
                    className="hover:opacity-75"
                  >
                    Back to sign in
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
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
                    Create account
                  </h1>
                  {pendingPlan ? (
                    <p style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      color: 'var(--accent)',
                      textTransform: 'uppercase',
                      margin: 0,
                    }}>
                      {pendingPlan === 'writer' ? 'Writer plan' : 'Author plan'} · activate after sign-in
                    </p>
                  ) : (
                    <p style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.22em',
                      color: 'var(--ink-dim)',
                      textTransform: 'uppercase',
                      margin: 0,
                    }}>
                      Free, no subscription
                    </p>
                  )}
                </div>

                {/* Social Login */}
                <div style={{ marginBottom: '24px' }}>
                  <SocialLoginButtons />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label htmlFor="name" style={{
                      display: 'block',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-low)',
                      marginBottom: '8px',
                    }}>
                      Name
                    </label>
                    <MagicInput
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder="Your name"
                      required
                    />
                  </div>

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
                        placeholder="At least 8 characters"
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
                    {/* Password strength indicator */}
                    <div style={{ marginTop: '8px', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px', visibility: password ? 'visible' : 'hidden' }}>
                      <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'var(--line)', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(strength.level / 3) * 100}%` }}
                          transition={{ duration: 0.3 }}
                          style={{ height: '100%', background: strength.color, borderRadius: '2px' }}
                        />
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: strength.color, minWidth: '40px' }}>
                        {strength.label || ' '}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" style={{
                      display: 'block',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-low)',
                      marginBottom: '8px',
                    }}>
                      Confirm password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MagicInput
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setConfirmTouched(true)}
                        className="input"
                        style={{
                          paddingRight: '2.5rem',
                          borderColor: confirmMismatch ? 'rgba(239,68,68,0.5)' : undefined,
                        }}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1} className="no-press absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--ink-low)', transition: 'color .15s' }}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmMismatch && (
                      <p style={{ marginTop: '6px', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.1em', color: '#ef4444' }}>
                        Passwords do not match
                      </p>
                    )}
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
                    {isLoading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>

                <p style={{ marginTop: '32px', fontFamily: 'var(--serif-body)', fontSize: '14px', color: 'var(--ink-dim)', textAlign: 'center' }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{ color: 'var(--accent)', transition: 'opacity .15s' }}
                    className="hover:opacity-75"
                  >
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterPage;


