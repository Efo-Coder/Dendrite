import { useState, useRef } from 'react';
import Modal from './Modal';
import { useAuthStore } from '../../store/useAuthStore';
import { useGlassPill } from '../../hooks/useGlassPill';
import { LogOut, KeyRound, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../ToastContainer';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const { user, logout, updateProfile, changePassword, deleteAccount } = useAuthStore();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const actionGroupRef = useRef<HTMLDivElement>(null);
  const { pill, onEnter, onLeave } = useGlassPill(actionGroupRef);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    try {
      await updateProfile(name.trim());
      toast.success('Name erfolgreich aktualisiert');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Name konnte nicht geändert werden');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Passwort erfolgreich geändert');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Passwort konnte nicht geändert werden');
    } finally {
      setPasswordLoading(false);
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
      toast.error(err.response?.data?.error || 'Konto konnte nicht gelöscht werden');
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profil">
      <div className="space-y-6">

        {/* Avatar + Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-accent-fg"
            style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border-strong)' }}>
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-accent-fg">{user?.name || '–'}</p>
            <p className="text-xs text-accent-subtle">{user?.email}</p>
            {memberSince && (
              <p className="text-xs text-accent-subtle mt-0.5">Mitglied seit {memberSince}</p>
            )}
          </div>
        </div>

        <div className="h-px border-t glass-divider" />

        {/* Name ändern */}
        <div>
          <label className="block text-xs font-medium text-accent-fg mb-3 uppercase tracking-wide flex items-center gap-1.5">
            <Pencil className="w-3 h-3" /> Name ändern
          </label>
          <form onSubmit={handleUpdateName} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anzeigename"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={nameLoading || !name.trim()}
              className="btn-subtle disabled:opacity-50"
            >
              {nameLoading ? '...' : 'Speichern'}
            </button>
          </form>
        </div>

        {/* Passwort ändern */}
        <div>
          <label className="block text-xs font-medium text-accent-fg mb-3 uppercase tracking-wide flex items-center gap-1.5">
            <KeyRound className="w-3 h-3" /> Passwort ändern
          </label>
          <form onSubmit={handleChangePassword} className="space-y-2">
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Aktuelles Passwort"
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-subtle hover:text-accent-fg transition-colors">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort"
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-subtle hover:text-accent-fg transition-colors">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Neues Passwort bestätigen"
                className="input pr-10"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-subtle hover:text-accent-fg transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="btn-subtle w-full disabled:opacity-50"
            >
              {passwordLoading ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        <div className="h-px border-t glass-divider" />

        {/* Abmelden & Konto löschen */}
        <div ref={actionGroupRef} className="relative space-y-2" onMouseLeave={onLeave}>
          {pill && (
            <div
              className="glass-pill"
              style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
            />
          )}

          <button
            onClick={handleLogout}
            onMouseEnter={(e) => onEnter(e, false)}
            className="btn-subtle w-full flex items-center gap-2 text-red-500 relative z-10"
            type="button"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              onMouseEnter={(e) => onEnter(e, false)}
              className="btn-subtle w-full flex items-center gap-2 relative z-10"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
              <span>Konto löschen</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                onMouseEnter={(e) => onEnter(e, false)}
                className="btn-subtle flex-1 relative z-10"
                type="button"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAccount}
                onMouseEnter={(e) => onEnter(e, false)}
                disabled={deleteLoading}
                className="btn-subtle flex-1 text-red-500 relative z-10"
                type="button"
              >
                {deleteLoading ? 'Wird gelöscht...' : 'Endgültig löschen'}
              </button>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};

export default UserProfileModal;
