import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { authService } from '../../../services/auth.service';
import ToggleSwitch from '../../ui/ToggleSwitch';
import { MagicInput } from '../../ui/MagicInput';

// "Sync & Backup" settings pane: auto-save, local backup and 2FA management
const SyncTab = () => {
  const { autoSave, setAutoSave } = useSettingsStore();
  const { user } = useAuthStore();

  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    if (user) setTwoFAEnabled(user.twoFactorEnabled ?? false);
  }, [user]);

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
      <div className="settings-row">
        <div className="lbl">Auto-save<small>Notes are saved automatically as you type.</small></div>
        <ToggleSwitch checked={autoSave} onChange={setAutoSave} />
      </div>
      <div className="settings-row">
        <div className="lbl">Local backup<small>Encrypted on disk.</small></div>
        <button className="btn-ghost" style={{ border: '0.5px solid var(--line)' }}>Export</button>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <MagicInput
              type="text"
              inputMode="numeric"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input"
              placeholder="000000"
              style={{ letterSpacing: '0.2em', textAlign: 'center' }}
              wrapperStyle={{ flex: 1 }}
              maxLength={6}
            />
            <button
              className="btn-ghost"
              style={{ border: '0.5px solid var(--line)' }}
              onClick={handleEnable2FA}
              disabled={twoFALoading || twoFACode.length < 6}
            >
              {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Verifying…</span> : 'Confirm'}
            </button>
          </div>
          <button
            className="no-press"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', textAlign: 'left' }}
            onClick={() => setTwoFASetup(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {showDisable && twoFAEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--surface)', borderRadius: '10px', border: '0.5px solid var(--line)' }}>
          <p style={{ margin: 0, fontFamily: 'var(--serif-body)', fontSize: '13px', color: 'var(--ink-mid)' }}>
            Enter your password to disable two-factor authentication.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <MagicInput
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="input"
              placeholder="Your password"
              wrapperStyle={{ flex: 1 }}
            />
            <button
              className="btn-ghost"
              style={{ border: '0.5px solid var(--line)', color: 'var(--ink-mid)' }}
              onClick={handleDisable2FA}
              disabled={twoFALoading || !disablePassword}
            >
              {twoFALoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} className="animate-spin" />Disabling…</span> : 'Confirm'}
            </button>
          </div>
          <button
            className="no-press"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', textAlign: 'left' }}
            onClick={() => { setShowDisable(false); setDisablePassword(''); }}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
};

export default SyncTab;
