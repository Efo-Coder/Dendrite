import { User } from 'lucide-react';

interface UserMenuProps {
  onOpenProfile: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const UserMenu = ({ onOpenProfile, onMouseEnter }: UserMenuProps) => {
  return (
    <button
      onClick={onOpenProfile}
      onMouseEnter={onMouseEnter}
      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors relative z-10"
      title="Profil"
      aria-label="Profil"
      type="button"
    >
      <User className="w-4 h-4 text-accent-fg transition-colors" />
    </button>
  );
};

export default UserMenu;
