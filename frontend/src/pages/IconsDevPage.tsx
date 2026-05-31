import { Icons } from '../components/ui/Icons';

const ALL_ICONS = Object.entries(Icons) as [keyof typeof Icons, (p: { size?: number }) => JSX.Element][];

export default function IconsDevPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', background: '#0f0f0f', minHeight: '100vh', color: '#fff' }}>
      <h2 style={{ marginBottom: '32px', fontSize: '18px', color: '#aaa' }}>Icons.tsx — alle Icons</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
        {ALL_ICONS.map(([name, IconComp]) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
            <IconComp size={24} />
            <span style={{ fontSize: '11px', color: '#888' }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
