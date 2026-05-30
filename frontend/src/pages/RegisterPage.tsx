import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToast } from '../components/ui/ToastContainer';
import Logo from '../components/ui/Logo';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, Mail, Home } from 'lucide-react';
import api from '../services/api';

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
  const { register, error, isLoading } = useAuthStore();
  const toast = useToast();
  const prevError = useRef<string | null>(null);

  useEffect(() => {
    const plan = sessionStorage.getItem('pending_plan');
    if (plan === 'writer' || plan === 'author') setPendingPlan(plan);
  }, []);

  useEffect(() => {
    const msg = localError || error;
    if (msg && msg !== prevError.current) {
      toast.error(msg, 6000);
      prevError.current = msg;
    }
    if (!msg) prevError.current = null;
  }, [localError, error]);

  const { themeMode, setThemeMode } = useSettingsStore();

  const strength = getPasswordStrength(password);
  const confirmMismatch = confirmTouched && confirmPassword !== '' && confirmPassword !== password;

  const handleResend = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendDone(false);
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

  const displayError = localError || error;

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
            color: 'var(--ink-mid)',
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
            color: 'var(--ink-mid)',
          }}
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Form area */}
        <div className="relative z-10 flex-1 flex items-center justify-center" style={{ padding: '64px 40px' }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>

            {emailSent ? (
              /* Success state */
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
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
                  <span style={{ color: 'var(--ink-mid)', fontWeight: 500 }}>{email}</span>.{' '}
                  Click the link to complete your registration.
                </p>
                <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.16em', color: 'var(--ink-dim)', textTransform: 'uppercase', margin: 0 }}>
                  Link valid for 24 hours
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  {resendDone ? (
                    <p style={{ fontFamily: 'var(--serif-body)', fontSize: '13px', color: '#26ad53' }}>Verification email sent.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="no-press"
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '10px',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-dim)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color .15s',
                        opacity: resendLoading ? 0.4 : 1,
                      }}
                    >
                      {resendLoading ? 'Sending…' : 'Resend email'}
                    </button>
                  )}
                  <Link
                    to="/login"
                    style={{ color: 'var(--accent)', fontFamily: 'var(--serif-body)', fontSize: '14px', transition: 'opacity .15s' }}
                    className="hover:opacity-75"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <>
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label htmlFor="name" style={{
                      display: 'block',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-mid)',
                      marginBottom: '8px',
                    }}>
                      Name <span style={{ color: 'var(--ink-dim)', letterSpacing: '0.05em', textTransform: 'none', fontSize: '9px' }}>(optional)</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder="Your name"
                    />
                  </div>

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
                        placeholder="At least 8 characters"
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
                    {/* Password strength indicator */}
                    {password && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'var(--line)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(strength.level / 3) * 100}%` }}
                            transition={{ duration: 0.3 }}
                            style={{ height: '100%', background: strength.color, borderRadius: '2px' }}
                          />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: strength.color, minWidth: '40px' }}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" style={{
                      display: 'block',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-mid)',
                      marginBottom: '8px',
                    }}>
                      Confirm password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
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
                        className="no-press absolute right-3 top-1/2 -translate-y-1/2"
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
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
