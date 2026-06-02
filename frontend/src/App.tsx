import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { useAuthStore } from './store/useAuthStore';
import { ToastProvider } from './components/ui/ToastContainer';
import ThemeProvider from './components/ui/ThemeProvider';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SharedNotePage from './pages/SharedNotePage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
// Components
import PrivateRoute from './components/ui/PrivateRoute';

function RouterContent() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/shared/:token" element={<SharedNotePage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
<Route
          path="/*"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const { loadUser } = useAuthStore();
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <ThemeProvider>
<ToastProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <RouterContent />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
