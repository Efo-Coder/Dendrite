import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useSettingsStore } from '../store/useSettingsStore';
import Logo from '../components/ui/Logo';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Moon, Sun, Home, Mail, Loader2 } from 'lucide-react';
import { authService } from '../services/auth.service';
import { MagicInput } from '../components/ui/MagicInput';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { themeMode, setThemeMode } = useSettingsStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;
    setIsLoading(true);
    await Promise.allSettled([
      authService.forgotPassword(email),
      new Promise(res => setTimeout(res, 600)),
    ]);
    setSent(true);
    setIsLoading(false);
  };

  return (
    <motion.div
      className="flex min-h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      {/* Left: visual panel */}
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
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative z-10 flex-1 flex items-center justify-center" style={{ padding: '64px 40px' }}>
          <div style={{ width: '100%', maxWidth: '360px' }}>

            {sent ? (
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
                  Check your inbox
                </h1>
                <p style={{ fontFamily: 'var(--serif-body)', fontSize: '14px', color: 'var(--ink-low)', lineHeight: 1.65, margin: 0 }}>
                  If an account with{' '}
                  <span style={{ color: 'var(--ink-low)', fontWeight: 500 }}>{email}</span>{' '}
                  exists, we sent a reset link. Check your spam folder if it doesn't arrive.
                </p>
                <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.16em', color: 'var(--ink-dim)', textTransform: 'uppercase', margin: 0 }}>
                  Link valid for 1 hour
                </p>
                <Link
                  to="/login"
                  style={{ color: 'var(--accent)', fontFamily: 'var(--serif-body)', fontSize: '14px', transition: 'opacity .15s', marginTop: '8px' }}
                  className="hover:opacity-75"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
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
                    Reset password
                  </h1>
                  <p style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    letterSpacing: '0.22em',
                    color: 'var(--ink-dim)',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}>
                    We'll send you a reset link
                  </p>
                </div>

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
                      autoFocus
                    />
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
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send reset link'}
                  </button>
                </form>

                <p style={{ marginTop: '32px', fontFamily: 'var(--serif-body)', fontSize: '14px', color: 'var(--ink-dim)', textAlign: 'center' }}>
                  Remembered it?{' '}
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

export default ForgotPasswordPage;

