import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import Logo from '../components/ui/Logo';
import NightTransitionBackground from '../components/auth/NightTransitionBackground';
import { Eye, EyeOff, Moon, Sun, Mail } from 'lucide-react';
import api from '../services/api';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

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
  const { register, error, isLoading } = useAuthStore();
  const { themeMode, setThemeMode } = useSettingsStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 8) {
      setLocalError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    try {
      await register(email, password, name);
      setEmailSent(true);
    } catch (error) {
      // Error wird vom Store behandelt
    }
  };

  const displayError = localError || error;

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative"
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
          <p className="text-white/80">Erstelle dein Konto</p>
        </div>

        {/* Register Form / Success State */}
        <div
          className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--color-bg-secondary) 18%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-border-default) 55%, transparent)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
          }}
        >
          {emailSent ? (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(38,173,83,0.15)', border: '1px solid rgba(38,173,83,0.3)' }}>
                  <Mail className="w-7 h-7" style={{ color: '#26ad53' }} />
                </div>
              </div>
              <p className="text-white font-semibold text-lg">E-Mail gesendet</p>
              <p className="text-white/60 text-sm leading-relaxed">
                Wir haben eine Bestätigungs-E-Mail an <span className="text-white/80 font-medium">{email}</span> gesendet.<br/>
                Klicke auf den Link in der E-Mail, um deine Registrierung abzuschließen.
              </p>
              <p className="text-white/35 text-xs pt-1">Der Link ist 24 Stunden gültig.</p>
              <div className="pt-2 flex flex-col items-center gap-2">
                {resendDone ? (
                  <p className="text-green-400 text-xs">E-Mail wurde erneut gesendet.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="no-press text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                  >
                    {resendLoading ? 'Wird gesendet...' : 'E-Mail erneut senden'}
                  </button>
                )}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  Zur Anmeldung
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6 auth-inputs">
                {displayError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                    {displayError}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                    Name (optional)
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input placeholder-white/40"
                    placeholder="Dein Name"
                  />
                </div>

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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors no-press"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-2">
                    Passwort bestätigen
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input placeholder-white/40 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors no-press"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn w-full text-white/90 hover:text-white/70 font-medium transition-colors"
                >
                  {isLoading ? 'Wird registriert...' : 'Registrieren'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-white/90 text-sm">
                  Bereits ein Konto?{' '}
                  <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    Anmelden
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
