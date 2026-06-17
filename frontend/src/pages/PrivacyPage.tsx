import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { MoveLeft, MoveRight } from 'lucide-react';
import { LOGO_SRC } from '../config/brand';

export default function PrivacyPage() {
  // Reset on mount: under AnimatePresence mode="wait" the central scroll-to-top fires while the
  // previous page is still fading out, so a long source page (Privacy/Terms) leaves this one
  // scrolled down. Resetting once the page is actually mounted is reliable.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.28 }}
      style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100dvh' }}
    >
      {/* Header */}
      <header style={{ borderBottom: '0.5px solid var(--line)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 80px)', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={LOGO_SRC} alt="" style={{ width: '44px', height: '44px', opacity: 0.85 }} />
          </Link>
          <Link to="/" className="btn-ghost" style={{ padding: '12px 32px 13px', gap: '8px' }}>
            <MoveLeft size={14} />
            Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(16px, 5vw, 80px)' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '16px' }}>
          Legal
        </p>
        <h1 style={{ fontFamily: 'var(--serif-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 12px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.12em', color: 'var(--ink-dim)', marginBottom: '56px' }}>
          Last updated: June 2, 2026
        </p>

        <div style={{ fontFamily: 'var(--serif-body)', fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--ink-mid)', display: 'flex', flexDirection: 'column', gap: '48px' }}>

          <Section title="1. Overview">
            <p>Dendrite ("we", "our", or "us") is committed to protecting your personal data. This Privacy Policy explains what information we collect, how we use it, and what rights you have regarding your data. By using Dendrite, you agree to the practices described in this policy.</p>
          </Section>

          <Section title="2. Data We Collect">
            <p>We collect the following categories of personal data:</p>
            <ul>
              <li><strong>Account data:</strong> your email address and, if provided, your name. This is required to create and manage your account.</li>
              <li><strong>Content data:</strong> notes, folders, and tags you create within the app. This content belongs to you.</li>
              <li><strong>Usage data:</strong> technical information such as your IP address, browser type, operating system, and pages visited, collected automatically for security and performance purposes.</li>
              <li><strong>Communication data:</strong> any messages you send us via support channels.</li>
            </ul>
            <p>We do not collect payment data directly — payments are processed by third-party providers (e.g. Stripe) who have their own privacy policies.</p>
          </Section>

          <Section title="3. How We Use Your Data">
            <p>We use your data solely to:</p>
            <ul>
              <li>provide and maintain the Dendrite service</li>
              <li>authenticate your account and ensure security</li>
              <li>send essential transactional emails (account verification, password reset)</li>
              <li>respond to support requests</li>
              <li>improve the service through aggregated, anonymized analytics</li>
            </ul>
            <p>We do not sell your data to third parties. We do not use your note content for advertising or training machine learning models.</p>
          </Section>

          <Section title="4. Data Storage & Security">
            <p>Your data is stored on servers located within the European Union. All data is encrypted in transit (TLS) and at rest. We apply industry-standard security practices including access controls, regular security reviews, and monitoring.</p>
            <p>No method of transmission over the internet is 100% secure. In the event of a data breach that affects your rights, we will notify you as required by applicable law.</p>
          </Section>

          <Section title="5. Data Sharing">
            <p>We share your data only with trusted service providers who assist in operating the platform (hosting, email delivery, payment processing). These providers are contractually bound to handle your data securely and only for the purpose of providing their service to us.</p>
            <p>We will disclose your data to authorities if required by law or to protect the safety of users or the public.</p>
          </Section>

          <Section title="6. Cookies">
            <p>Dendrite uses strictly necessary cookies to maintain your session. We do not use third-party tracking cookies or advertising cookies. You can disable cookies in your browser settings, though this may affect the functionality of the service.</p>
          </Section>

          <Section title="7. Your Rights (GDPR)">
            <p>If you are located in the European Economic Area, you have the following rights under the General Data Protection Regulation (GDPR):</p>
            <ul>
              <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
              <li><strong>Rectification:</strong> request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> request deletion of your account and all associated data</li>
              <li><strong>Portability:</strong> request your data in a machine-readable format</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interests</li>
            </ul>
            <p>To exercise any of these rights, contact us at the address below. We will respond within 30 days.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain your account data for as long as your account is active. If you delete your account, we will permanently delete all your data within 30 days, except where retention is required by law.</p>
          </Section>

          <Section title="9. Third-Party Links">
            <p>Dendrite may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies independently.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or via a notice within the app. Your continued use of Dendrite after changes take effect constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="11. Contact">
            <p>If you have questions about this Privacy Policy or your personal data, please contact us at:</p>
            <p style={{ marginTop: '12px' }}>
              <strong>Dendrite</strong><br />
              Email: <a href="mailto:privacy@dendrite-notes.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>privacy@dendrite-notes.com</a>
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid var(--line)', padding: '24px clamp(16px, 5vw, 80px)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--ink-dim)', margin: 0 }}>
            © 2026 Dendrite
          </p>
          <Link to="/terms" className="btn-ghost" style={{ padding: '12px 32px 13px', gap: '8px' }}>
            Terms of Service
            <MoveRight size={14} />
          </Link>
        </div>
      </footer>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--serif-display)', fontSize: '1.25rem', fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}
