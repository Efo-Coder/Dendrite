import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import ConfirmAccountDeletionModal from '../ConfirmAccountDeletionModal';
import UpgradePlansModal from '../UpgradePlansModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../ui/ToastContainer';
import { getApiErrorMessage } from '../../../lib/apiError';
import api from '../../../services/api';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  writer: 'Writer',
  author: 'Author',
};

const PLAN_BLURBS: Record<string, string> = {
  free: 'Everything you need to get started.',
  writer: 'For people who write seriously.',
  author: 'Everything, forever. You own it.',
};

const AccountTab = () => {
  const { user, deleteAccount } = useAuthStore();
  const toast = useToast();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  const plan = (user?.plan || 'free').toLowerCase();

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/checkout/portal-session');
      window.location.href = data.url;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open billing portal'));
      setPortalLoading(false);
    }
  };

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
        <div className="lbl">Current plan<small>{PLAN_BLURBS[plan]}</small></div>
        <button
          onClick={() => setShowPlans(true)}
          type="button"
          className="transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: plan === 'free' ? 'var(--ink-low)' : 'var(--accent)',
            border: `1px solid ${plan === 'free' ? 'var(--line)' : 'color-mix(in oklch, var(--accent) 35%, transparent)'}`,
            borderRadius: '9999px',
            padding: '4px 12px',
            whiteSpace: 'nowrap',
            background: 'transparent',
          }}
        >
          {PLAN_LABELS[plan]}
        </button>
      </div>

      {plan === 'writer' && (
        <div className="settings-row">
          <div className="lbl">Subscription<small>Manage billing or cancel your Writer plan.</small></div>
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="btn-ghost"
            type="button"
          >
            {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Manage'}
          </button>
        </div>
      )}

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

      <UpgradePlansModal
        isOpen={showPlans}
        currentPlan={plan}
        onClose={() => setShowPlans(false)}
      />
    </>
  );
};

export default AccountTab;
