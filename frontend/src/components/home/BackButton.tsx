import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

// Top-right "back to Home" affordance for the category/spaces views.
const BackButton = ({ onClick, label = 'Home' }: BackButtonProps) => (
  <button type="button" className="home-back-btn" onClick={onClick}>
    <ArrowLeft size={16} strokeWidth={1.75} />
    {label}
  </button>
);

export default BackButton;
