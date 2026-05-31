export function BetaBadge({ style }: { style?: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--mono)',
      fontSize: '8px',
      fontWeight: 600,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      border: '0.5px solid color-mix(in oklch, var(--accent) 40%, transparent)',
      background: 'color-mix(in oklch, var(--accent) 10%, transparent)',
      padding: '3px 6px 1px',
      borderRadius: '4px',
      lineHeight: 1,
      flexShrink: 0,
      ...style,
    }}>
      Beta
    </span>
  );
}
