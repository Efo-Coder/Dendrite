import { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import ConfirmAccountDeletionModal from './ConfirmAccountDeletionModal';
import { useAuthStore } from '../../store/useAuthStore';
import { useGlassPill } from '../../hooks/useGlassPill';
import { LogOut, KeyRound, Pencil, Trash2, Eye, EyeOff, Camera, X } from 'lucide-react';
import { useToast } from '../ui/ToastContainer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  const handleDeleteAvatar = async () => {
    setAvatarLoading(true);
    try {
      await deleteAvatar();
      toast.success('Profilbild entfernt');
    } catch {
      toast.error('Profilbild konnte nicht entfernt werden');
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
      toast.success('Profilbild aktualisiert');
    } catch {
      toast.error('Profilbild konnte nicht hochgeladen werden');
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
      toast.error(err.response?.data?.error || 'Konto konnte nicht gelöscht werden');
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
    ? new Date(user.createdAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })
    : '';

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Profil">
      <div className="space-y-6">

        {/* Avatar + Info */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0 group/avatar">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarLoading}
              className="relative w-14 h-14 rounded-full group"
              title="Profilbild ändern"
            >
              {user?.avatarUrl ? (
                <img
                  src={`${API_URL}${user.avatarUrl}`}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="profile-avatar w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-text-primary">
                  {avatarLoading ? '...' : initials}
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
                title="Profilbild entfernen"
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
            <p className="text-sm font-semibold text-text-primary">{user?.name || '–'}</p>
            <p className="text-xs text-text-secondary">{user?.email}</p>
            {memberSince && (
              <p className="text-xs text-text-secondary mt-0.5">Mitglied seit {memberSince}</p>
            )}
          </div>
        </div>

        <div className="border-b glass-divider" />

        {/* Name ändern */}
        <div>
          <label className="text-xs font-medium text-text-primary mb-3 uppercase tracking-wide flex items-center gap-1.5">
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
              className="btn disabled:opacity-50"
            >
              {nameLoading ? '...' : 'Speichern'}
            </button>
          </form>
        </div>

        {/* Passwort ändern */}
        <div>
          <label className="text-xs font-medium text-text-primary mb-3 uppercase tracking-wide flex items-center gap-1.5">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors no-press">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors no-press">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors no-press">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="btn w-full disabled:opacity-50"
            >
              {passwordLoading ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        <div className="border-b glass-divider" />

        {/* Abmelden & Konto löschen */}
        <div ref={actionGroupRef} className="relative space-y-2" onMouseLeave={onLeave}>
          {pill && (
            <div
              className="glass-pill"
              style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height, opacity: pill.visible ? 1 : 0 }}
            />
          )}

          <button
            onClick={handleLogout}
            onMouseEnter={(e) => onEnter(e, false)}
            className="btn w-full flex items-center gap-2 text-text-primary hover:text-red-500 relative z-10"
            type="button"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            onMouseEnter={(e) => onEnter(e, false)}
            className="btn w-full flex items-center gap-2 relative z-10 text-text-primary hover:text-red-500"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            <span>Konto löschen</span>
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
