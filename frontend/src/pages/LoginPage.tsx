import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import Logo from '../components/ui/Logo';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, CheckCircle, AlertCircle, Send } from 'lucide-react';
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

  const isUnverifiedError = error?.includes('bestätige') ?? false;

  const handleResend = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResendDone(true);
    } catch {
      // Fehler ignorieren – generische Antwort vom Backend
      setResendDone(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      // Error wird vom Store behandelt
    }
  };

  return (
    <motion.div
      className="min-h-dvh flex items-center justify-center relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeInOut' } }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      <NightTransitionBackground isDark={themeMode === 'dark'} />

      {/* Theme Toggle Button */}
      <button
        onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 right-6 z-20 icon-btn-lg rounded-full flex items-center justify-center text-text-secondary hover:text-white transition-colors backdrop-blur-xl"
        style={{
          background: 'color-mix(in srgb, var(--color-bg-secondary) 22%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-border-default) 55%, transparent)',
        }}
        title={`Zu ${themeMode === 'dark' ? 'hellem' : 'dunklem'} Modus wechseln`}
      >
        {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="flex justify-center -mb-1">
            <Logo size="xl" showText={false} style={{ '--color-icon-primary': '#26ad53', '--color-icon-secondary': '#1ee85a' } as React.CSSProperties} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Dendrite</h1>
          <p className="text-white/80">Melde dich an, um fortzufahren</p>
        </div>

        {/* Login Form */}
        <div
          className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--color-bg-secondary) 18%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-border-default) 55%, transparent)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6 auth-inputs">
            {verified === 'true' && (
              <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                E-Mail bestätigt – du kannst dich jetzt anmelden.
              </div>
            )}
            {(verified === 'expired' || verified === 'error') && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {verified === 'expired' ? 'Der Bestätigungslink ist abgelaufen.' : 'Ungültiger Bestätigungslink.'}
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm space-y-2">
                <p>{error}</p>
                {isUnverifiedError && (
                  resendDone ? (
                    <p className="text-green-400 text-xs">E-Mail wurde erneut gesendet.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading || !email}
                      className="no-press flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors disabled:opacity-40"
                    >
                      <Send className="w-3 h-3" />
                      {resendLoading ? 'Wird gesendet...' : 'Bestätigungs-E-Mail erneut senden'}
                    </button>
                  )
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input placeholder-white/40"
                placeholder="deine@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                Passwort
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input placeholder-white/40 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B3A7] hover:text-white transition-colors no-press"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn w-full text-white/90 hover:text-white/70 font-medium transition-colors"
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/90 text-sm">
              Noch kein Konto?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                Registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
