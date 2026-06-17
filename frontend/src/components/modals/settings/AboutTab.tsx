import { LOGO_SRC } from '../../../config/brand';

// "About" settings pane: logo, name and colophon
const AboutTab = () => (
  <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '20px 0', fontFamily: 'var(--serif-display)' }}>
    <img src={LOGO_SRC} alt="Dendrite" style={{ width: 72, height: 72, marginBottom: 8, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
    <div style={{ fontSize: 22, color: 'var(--ink)', letterSpacing: '0.02em' }}>Dendrite</div>
    <div style={{ fontSize: 13, color: 'var(--ink-low)', fontStyle: 'italic', marginTop: 4 }}>
      Notes for the patient mind. Letterpress edition.
    </div>
    <div style={{ marginTop: 24, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
      MMXXVI · Set in Cormorant & Garamond
    </div>
  </div>
);

export default AboutTab;
