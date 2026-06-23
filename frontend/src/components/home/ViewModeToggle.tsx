import { LayoutGrid, Grid3x3, List, type LucideIcon } from 'lucide-react';
import type { CardViewMode } from '../../lib/viewMode';

const MODES: { mode: CardViewMode; Icon: LucideIcon; label: string }[] = [
  { mode: 'tile', Icon: LayoutGrid, label: 'Tiles' },
  { mode: 'small', Icon: Grid3x3, label: 'Small tiles' },
  { mode: 'list', Icon: List, label: 'List' },
];

interface ViewModeToggleProps {
  value: CardViewMode;
  onChange: (mode: CardViewMode) => void;
}

// Segmented control for the full category/spaces views — switches card density/layout.
const ViewModeToggle = ({ value, onChange }: ViewModeToggleProps) => (
  <div className="view-toggle" role="group" aria-label="View">
    {MODES.map(({ mode, Icon, label }) => (
      <button
        key={mode}
        type="button"
        className={`view-toggle-btn${value === mode ? ' active' : ''}`}
        title={label}
        aria-pressed={value === mode}
        onClick={() => onChange(mode)}
      >
        <Icon size={16} strokeWidth={1.75} />
      </button>
    ))}
  </div>
);

export default ViewModeToggle;
