import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { MagicInput } from '../ui/MagicInput';
import ConfirmAccountDeletionModal from './ConfirmAccountDeletionModal';
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, KeyRound, Pencil, Trash2, Eye, EyeOff, Camera, X } from 'lucide-react';

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
import { useToast } from '../ui/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL || '';
const resolveAvatar = (url: string) => url.startsWith('http') ? url : `${API_URL}${url}`;

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const { user, logout, updateProfile, changePassword, deleteAccount, uploadAvatar, deleteAvatar } = useAuthStore();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName(user?.name || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setShowDeleteModal(false);
    }
  }, [isOpen, user?.name]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    try {
      await updateProfile(name.trim());
      toast.success('Name updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not update name');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not change password');
    } finally {
      setPasswordLoading(false);
    }
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

  const handleLogout = () => {
    onClose();
    logout();
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not delete account');
      setDeleteLoading(false);
      setShowDeleteModal(false);
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

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Profile" className="profile-modal">
      <div className="space-y-6">

        {/* Avatar + Info */}
        <div className="flex items-center gap-4">
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
                <div className="avatar-initials" style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif-display)', fontWeight: 600, fontSize: '20px',
                  boxShadow: '0 0 0 0.5px var(--line)',
                }}>
                  {avatarLoading ? '…' : initials}
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
            <p className="text-sm font-semibold text-(--ink)">{user?.name || '–'}</p>
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

        <div className="border-b border-(--line-soft)" />

        {/* Name ändern */}
        <div>
          <label className="text-xs font-medium text-(--ink) mb-3 uppercase tracking-wide flex items-center gap-1.5">
            <Pencil className="w-3 h-3" /> Change name
          </label>
          <form onSubmit={handleUpdateName} className="flex gap-2">
            <MagicInput
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="modal-input"
              style={{ width: '100%' }}
              wrapperStyle={{ flex: 1, borderRadius: '10px' }}
            />
            <button
              type="submit"
              disabled={nameLoading || !name.trim() || name.trim() === (user?.name ?? '')}
              className="btn group relative disabled:opacity-50"
            >
              <span className="relative inline-block">
                {nameLoading ? '...' : 'Save'}
                <span className="absolute left-0 w-0 group-hover:w-full group-disabled:hidden" style={{ bottom: '-2px', height: '0.5px', background: 'currentColor', transition: 'width 0.4s cubic-bezier(.2,.7,.2,1)' }} />
              </span>
            </button>
          </form>
        </div>

        {/* Passwort ändern — nur für Nutzer ohne Social Login */}
        {!user?.provider && <div>
          <label className="text-xs font-medium text-(--ink) mb-3 uppercase tracking-wide flex items-center gap-1.5">
            <KeyRound className="w-3 h-3" /> Change password
          </label>
          <form onSubmit={handleChangePassword} className="space-y-2">
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
              className="btn group relative w-full disabled:opacity-50"
            >
              <span className="relative inline-block">
                {passwordLoading ? 'Changing...' : 'Change password'}
                <span className="absolute left-0 w-0 group-hover:w-full group-disabled:hidden" style={{ bottom: '-2px', height: '0.5px', background: 'currentColor', transition: 'width 0.4s cubic-bezier(.2,.7,.2,1)' }} />
              </span>
            </button>
          </form>
        </div>}

        {/* Abmelden & Konto löschen */}
        <div className="modal-form-ft" style={{ flexDirection: 'column' }}>
          <button
            onClick={handleLogout}
            className="btn group relative w-full flex items-center gap-2 text-(--ink) hover:text-red-500"
            type="button"
          >
            <LogOut className="w-4 h-4" />
            <span className="relative inline-block">
              Sign out
              <span className="absolute left-0 w-0 group-hover:w-full group-disabled:hidden" style={{ bottom: '-2px', height: '0.5px', background: 'currentColor', transition: 'width 0.4s cubic-bezier(.2,.7,.2,1)' }} />
            </span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn group relative w-full flex items-center gap-2 text-(--ink) hover:text-red-500"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            <span className="relative inline-block">
              Delete account
              <span className="absolute left-0 w-0 group-hover:w-full group-disabled:hidden" style={{ bottom: '-2px', height: '0.5px', background: 'currentColor', transition: 'width 0.4s cubic-bezier(.2,.7,.2,1)' }} />
            </span>
          </button>
        </div>

      </div>
    </Modal>

    <ConfirmAccountDeletionModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      onConfirm={handleDeleteAccount}
      isLoading={deleteLoading}
    />
    </>
  );
};

export default UserProfileModal;
