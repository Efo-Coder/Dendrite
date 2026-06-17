import { Fragment } from 'react';
import { modKey } from '../../../lib/platform';

const getShortcuts = (): [string, string][] => {
  const mod = modKey();
  return [
    ['Compose new note', `${mod} N`],
    ['Search', `${mod} F`],
    ['Toggle sidebar', `${mod} \\`],
    ['Bold', `${mod} B`],
    ['Italic', `${mod} I`],
    ['Underline', `${mod} U`],
    ['Pin / unpin', `${mod} P`],
    ['Settings', `${mod} ,`],
  ];
};

// "Shortcuts" settings pane: keyboard shortcut reference
const ShortcutsTab = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', paddingTop: '16px', gap: '12px 24px', fontFamily: 'var(--serif-body)', fontSize: 14 }}>
    {getShortcuts().map(([label, key]) => (
      <Fragment key={label}>
        <span style={{ color: 'var(--ink-mid)' }}>{label}</span>
        <kbd style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 5, border: '0.5px solid var(--line)' }}>{key}</kbd>
      </Fragment>
    ))}
  </div>
);

export default ShortcutsTab;
