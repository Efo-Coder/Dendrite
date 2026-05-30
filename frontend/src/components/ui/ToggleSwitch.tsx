import * as motion from 'motion/react-client';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

const ToggleSwitch = ({ checked, onChange }: ToggleSwitchProps) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    style={{
      width: 40,
      height: 22,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      padding: '3px',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      background: checked
        ? 'color-mix(in oklch, var(--accent) 35%, transparent)'
        : 'var(--surface-hi)',
      border: `0.5px solid ${checked ? 'color-mix(in oklch, var(--accent) 50%, transparent)' : 'var(--line)'}`,
      cursor: 'pointer',
      transition: 'background 0.2s, border-color 0.2s',
      flexShrink: 0,
    }}
  >
    <motion.div
      layout
      transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.25 }}
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: checked ? 'var(--accent)' : 'var(--ink-dim)',
        transition: 'background 0.2s',
      }}
    />
  </button>
);

export default ToggleSwitch;
