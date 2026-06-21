import { useState } from 'react';
import ConfirmAccountDeletionModal from '../ConfirmAccountDeletionModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../ui/ToastContainer';
import { getApiErrorMessage } from '../../../lib/apiError';

const AccountTab = () => {
  const { deleteAccount } = useAuthStore();
  const toast = useToast();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete account'));
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="settings-row">
        <div className="lbl">Delete account<small>Permanently removes your account and all notes.<br />This cannot be undone.</small></div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn danger"
          type="button"
        >
          Delete
        </button>
      </div>

      <ConfirmAccountDeletionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={deleteLoading}
      />
    </>
  );
};

export default AccountTab;
