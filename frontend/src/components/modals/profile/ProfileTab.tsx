import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Check } from 'lucide-react';
import { MagicInput } from '../../ui/MagicInput';
import { useAuthStore } from '../../../store/useAuthStore';
import { authService } from '../../../services/auth.service';
import { useToast } from '../../ui/ToastContainer';
import { getApiErrorMessage } from '../../../lib/apiError';

// ─── Provider badges ───────────────────────────────────────────────
const PROVIDER_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  google: {
    label: 'Google',
    icon: (
      <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
      </svg>
    ),
  },
  microsoft: {
    label: 'Microsoft',
    icon: (
      <svg width="13" height="13" viewBox="0 0 21 21" fill="none">
        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
      </svg>
    ),
  },
};

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => (url.startsWith('http') ? url : `${API_URL}${url}`);

const MAX_BIO_CHARS = 200;
const USERNAME_MAX = 20;

// Keep the field to the server's character set, so the live check only ever
// disagrees on availability — never on format.
const sanitizeHandle = (v: string) => v.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, USERNAME_MAX);

const ProfileTab = () => {
  const { user, updateProfile, uploadAvatar, deleteAvatar } = useAuthStore();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'error'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bioTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNameSave = (value: string) => {
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(async () => {
      const trimmed = value.trim();
      if (!trimmed || trimmed === (user?.name ?? '')) return;
      try {
        await updateProfile({ name: trimmed });
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not update name'));
      }
    }, 600);
  };

  const scheduleBioSave = (value: string) => {
    if (bioTimer.current) clearTimeout(bioTimer.current);
    bioTimer.current = setTimeout(async () => {
      const trimmed = value.trim();
      if (trimmed === (user?.bio ?? '')) return;
      try {
        await updateProfile({ bio: trimmed });
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not update bio'));
      }
    }, 600);
  };

  // Debounced: check availability, then save on success. Format is already
  // guaranteed by sanitizeHandle, so the server only weighs in on uniqueness.
  const handleUsernameChange = (raw: string) => {
    const value = sanitizeHandle(raw);
    setUsername(value);
    setUsernameError('');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);

    if (value === (user?.username ?? '') || value.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const { available, error } = await authService.checkUsernameAvailable(value);
        if (!available) {
          setUsernameStatus('error');
          setUsernameError(error || 'This username is already taken');
          return;
        }
        await updateProfile({ username: value });
        setUsernameStatus('available');
      } catch (err) {
        setUsernameStatus('error');
        setUsernameError(getApiErrorMessage(err, 'Could not update username'));
      }
    }, 500);
  };

  const handleDeleteAvatar = async () => {
    setAvatarLoading(true);
    try {
      await deleteAvatar();
      toast.success('Profile picture removed');
    } catch {
      toast.error('Could not remove profile picture');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await uploadAvatar(file);
      toast.success('Profile picture updated');
    } catch {
      toast.error('Could not upload profile picture');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : '';

  // Counter turns accent near the limit and danger once it's reached.
  const bioRemaining = MAX_BIO_CHARS - bio.length;
  const bioCounterColor = bioRemaining <= 0 ? 'var(--danger)' : bioRemaining <= 20 ? 'var(--accent)' : 'var(--ink-dim)';

  return (
    <>
      {/* Identity header — read-only, not part of the editable rows */}
      <div className="flex items-center gap-4" style={{ padding: '4px 0 16px', borderBottom: '0.5px solid var(--line-soft)' }}>
        <div className="relative w-14 h-14 shrink-0 group/avatar">
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarLoading}
            className="relative w-14 h-14 rounded-full group"
            title="Change profile picture"
          >
            {user?.avatarUrl ? (
              <img
                src={resolveAvatar(user.avatarUrl)}
                alt="Avatar"
                className="w-14 h-14 rounded-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="avatar-fill w-full h-full" style={{ fontSize: '20px' }}>
                {avatarLoading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink)' }} /> : initials}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          {user?.avatarUrl && (
            <button
              onClick={handleDeleteAvatar}
              disabled={avatarLoading}
              title="Remove profile picture"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all opacity-0 group-hover/avatar:opacity-100"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div>
          <p className="text-sm font-medium text-(--ink)">{user?.name || '–'}</p>
          <p className="text-xs text-(--ink-mid)">{user?.email}</p>
          {user?.provider && PROVIDER_LABELS[user.provider] && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              marginTop: '5px', padding: '2px 8px', borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--bg-panel)',
            }}>
              {PROVIDER_LABELS[user.provider].icon}
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--ink-dim)' }}>
                Signed in with {PROVIDER_LABELS[user.provider].label}
              </span>
            </div>
          )}
          {memberSince && (
            <p className="text-xs text-(--ink-mid) mt-0.5">Member since {memberSince}</p>
          )}
        </div>
      </div>

      <div className="settings-row">
        <div className="lbl">Display name<small>The name shown across Dendrite.</small></div>
        <MagicInput
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); scheduleNameSave(e.target.value); }}
          placeholder="Your name"
          className="modal-input"
          wrapperStyle={{ width: 200, borderRadius: '10px' }}
        />
      </div>

      <div className="settings-row" style={{ alignItems: 'flex-start' }}>
        <div className="lbl">Username<small>Your unique @handle — used for invites and your profile.</small></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MagicInput
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="username"
              className="modal-input"
              wrapperStyle={{ width: 200, borderRadius: '10px' }}
            />
            {usernameStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-(--ink-dim)" />}
            {usernameStatus === 'available' && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
          </div>
          {usernameStatus === 'error' && (
            <span style={{ fontSize: '11px', color: 'var(--danger)' }}>{usernameError}</span>
          )}
        </div>
      </div>

      <div className="settings-row" style={{ alignItems: 'flex-start' }}>
        <div className="lbl">Bio<small>Write something about yourself.<br /> This will be shown on your public profile.</small></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 220 }}>
          <MagicInput
            multiline
            value={bio}
            onChange={(e) => { setBio(e.target.value); scheduleBioSave(e.target.value); }}
            placeholder="A sentence about yourself…"
            rows={3}
            maxLength={MAX_BIO_CHARS}
            className="modal-input resize-none"
            style={{ width: '100%' }}
            wrapperStyle={{ borderRadius: '10px' }}
          />
          <span style={{ alignSelf: 'flex-end', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.1em', color: bioCounterColor, transition: 'color 0.2s ease' }}>
            {bio.length} / {MAX_BIO_CHARS}
          </span>
        </div>
      </div>
    </>
  );
};

export default ProfileTab;
