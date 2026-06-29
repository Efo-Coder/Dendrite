import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getModalPortalRoot } from '../../lib/modalPortalRoot';
import { plans, Plan, PLAN_ORDER } from '../../config/plans';
import PricingCard from '../landing/PricingCard';

interface UpgradePlansModalProps {
  isOpen: boolean;
  currentPlan: string;
  onClose: () => void;
}

const CTA_BASE = 'w-full text-center text-sm font-medium';
const CTA_STYLE = { padding: '12px 24px', borderRadius: '9999px' } as const;

// CTA per card relative to the user's current plan. Upgrades stay beta-locked
// ("Available soon") until checkout goes live.
function planFooter(plan: Plan, currentPlan: string): ReactNode {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan as Plan['id']);
  const cardIdx = PLAN_ORDER.indexOf(plan.id);

  if (cardIdx === currentIdx) {
    return (
      <div
        className={CTA_BASE}
        style={{
          ...CTA_STYLE,
          color: 'var(--accent)',
          border: '1px solid color-mix(in oklch, var(--accent) 35%, transparent)',
        }}
      >
        Current plan
      </div>
    );
  }
  if (cardIdx < currentIdx) {
    return (
      <div
        className={CTA_BASE}
        style={{ ...CTA_STYLE, color: 'var(--ink-low)', border: '1px solid var(--line)' }}
      >
        Included
      </div>
    );
  }
  return (
    <button className={`btn primary ${CTA_BASE}`} style={CTA_STYLE} disabled type="button">
      Available soon
    </button>
  );
}

const UpgradePlansModal = ({ isOpen, currentPlan, onClose }: UpgradePlansModalProps) => {
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visibleRef.current) {
      setClosing(true);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    // Capture phase + stopPropagation so Escape closes only this modal, not the
    // UserProfileModal underneath (its Escape listener runs in the bubble phase).
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, [isOpen, onClose]);

  if (!visible) return null;

  return createPortal(
    <div className={`modal-overlay${closing ? ' closing' : ''}`} onClick={onClose}>
      <div className="modal plans-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="ornament">— · plans · —</div>
          <h3>Choose your plan</h3>
        </div>

        <div className="plans-modal-grid">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} compact footer={planFooter(plan, currentPlan)} />
          ))}
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    getModalPortalRoot()
  );
};

export default UpgradePlansModal;
