import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import Logo from '../components/Logo';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

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
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative"
      style={{ backgroundImage: "url('/dendrite-forest.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 " />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="flex justify-center -mb-1">
            <Logo size="xl" showText={false} style={{ '--color-icon': '#26ad53', '--color-accent-brand': '#1ee85a' } as React.CSSProperties} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Dendrite</h1>
          <p className="text-white/80">Melde dich an, um fortzufahren</p>
        </div>

        {/* Login Form */}
        <div
          className="rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.10)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6 auth-inputs">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
                {error}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-subtle w-full text-white/70 hover:text-white font-medium transition-colors"
            >
              {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/90 text-sm">
              Noch kein Konto?{' '}
              <Link to="/register" className="text-white/70 hover:text-white font-medium transition-colors">
                Registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
