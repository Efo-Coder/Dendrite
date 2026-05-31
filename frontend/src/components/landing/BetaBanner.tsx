export const BETA_BANNER_HEIGHT = 36;

export function BetaBanner() {
  return (
    <div style={{
      position: 'absolute',
      top: 64,
      left: 0,
      right: 0,
      height: `${BETA_BANNER_HEIGHT}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'color-mix(in oklch, var(--accent) 10%, var(--bg))',
      borderTop: '0.5px solid color-mix(in oklch, var(--accent) 22%, transparent)',
      borderBottom: '0.5px solid color-mix(in oklch, var(--accent) 22%, transparent)',
      fontFamily: 'var(--mono)',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-mid)',
    }}>
      Dendrite is currently in beta — expect rough edges.
    </div>
  );
}
