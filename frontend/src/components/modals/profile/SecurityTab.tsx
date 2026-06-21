import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { MagicInput } from '../../ui/MagicInput';
import { useAuthStore } from '../../../store/useAuthStore';
import { authService } from '../../../services/auth.service';
import { useToast } from '../../ui/ToastContainer';
import { getApiErrorMessage } from '../../../lib/apiError';

const SecurityTab = () => {
  const { changePassword, user } = useAuthStore();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    if (user) setTwoFAEnabled(user.twoFactorEnabled ?? false);
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.warning('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await Promise.all([
        changePassword(currentPassword, newPassword),
        new Promise(r => setTimeout(r, 900)),
      ]);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not change password'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const [data] = await Promise.all([
        authService.setup2FA(),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setTwoFASetup(data);
    } catch {
      /* keep the pane usable; the button can be pressed again */
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleCopySecret = async () => {
    if (!twoFASetup) return;
    try {
      await navigator.clipboard.writeText(twoFASetup.secret);
      toast.success('Setup key copied');
    } catch {
      toast.error('Could not copy key');
    }
  };

  const handleEnable2FA = async () => {
    if (twoFACode.length < 6) return;
    setTwoFALoading(true);
    try {
      await Promise.all([
        authService.enable2FA(twoFACode),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setTwoFAEnabled(true);
      setTwoFASetup(null);
      setTwoFACode('');
    } catch {
      /* invalid code — user can retry */
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) return;
    setTwoFALoading(true);
    try {
      await Promise.all([
        authService.disable2FA(disablePassword),
        new Promise(r => setTimeout(r, 900)),
      ]);
      setTwoFAEnabled(false);
      setShowDisable(false);
      setDisablePassword('');
    } catch {
      /* wrong password — user can retry */
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <>
      <div className="settings-row" style={{ alignItems: 'flex-start' }}>
        <div className="lbl">Password<small>Choose a strong, unique password.</small></div>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 220 }}>
          <div className="relative">
            <MagicInput
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="modal-input"
              style={{ paddingRight: '40px' }}
              wrapperStyle={{ borderRadius: '10px' }}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors no-press">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <MagicInput
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="modal-input"
              style={{ paddingRight: '40px' }}
              wrapperStyle={{ borderRadius: '10px' }}
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors no-press">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <MagicInput
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="modal-input"
              style={{ paddingRight: '40px' }}
              wrapperStyle={{ borderRadius: '10px' }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors no-press">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="btn-ghost disabled:opacity-50"
            style={{ border: '0.5px solid var(--line)' }}
          >
            {passwordLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Changing…</span> : 'Change password'}
          </button>
        </form>
      </div>

      <div className="settings-row" style={{ alignItems: 'flex-start' }}>
        <div className="lbl">
          Two-factor authentication
          <small>{twoFAEnabled ? 'Your account is protected with an authenticator app.' : 'Add an extra layer of security to your account.'}</small>
        </div>
        {twoFAEnabled ? (
          <button
            className="btn-ghost"
            style={{ border: '0.5px solid var(--line)', color: 'var(--ink-mid)' }}
            onClick={() => setShowDisable(!showDisable)}
          >
            Disable
          </button>
        ) : (
          !twoFASetup && (
            <button
              className="btn-ghost"
              style={{ border: '0.5px solid var(--line)' }}
              onClick={handleSetup2FA}
              disabled={twoFALoading}
            >
              {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Loading…</span> : 'Enable'}
            </button>
          )
        )}
      </div>

      {twoFASetup && !twoFAEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '10px', border: '0.5px solid var(--line)' }}>
          <p style={{ margin: 0, fontFamily: 'var(--serif-body)', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.
          </p>
          <img src={twoFASetup.qrCode} alt="QR Code" style={{ width: '160px', height: '160px', borderRadius: '8px', alignSelf: 'center' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
              Or enter this key manually
            </span>
            <button
              type="button"
              onClick={handleCopySecret}
              title="Copy setup key"
              className="twofa-key"
            >
              {twoFASetup.secret}
            </button>
          </div>
          <MagicInput
            type="text"
            inputMode="numeric"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="modal-input"
            placeholder="000000"
            style={{ letterSpacing: '0.2em', textAlign: 'center' }}
            wrapperStyle={{ borderRadius: '10px' }}
            maxLength={6}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn danger"
              style={{ flex: 1 }}
              onClick={() => setTwoFASetup(null)}
            >
              Cancel
            </button>
            <button
              className="btn-ghost"
              style={{ border: '0.5px solid var(--line)', flex: 1 }}
              onClick={handleEnable2FA}
              disabled={twoFALoading || twoFACode.length < 6}
            >
              {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Verifying…</span> : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {showDisable && twoFAEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--surface)', borderRadius: '10px', border: '0.5px solid var(--line)' }}>
          <p style={{ margin: 0, fontFamily: 'var(--serif-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
            Enter your password to disable two-factor authentication.
          </p>
          <MagicInput
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            className="modal-input"
            placeholder="Your password"
            wrapperStyle={{ borderRadius: '10px' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn danger"
              style={{ flex: 1 }}
              onClick={() => { setShowDisable(false); setDisablePassword(''); }}
            >
              Cancel
            </button>
            <button
              className="btn-ghost"
              style={{ border: '0.5px solid var(--line)', color: 'var(--ink-mid)', flex: 1 }}
              onClick={handleDisable2FA}
              disabled={twoFALoading || !disablePassword}
            >
              {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Disabling…</span> : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SecurityTab;
