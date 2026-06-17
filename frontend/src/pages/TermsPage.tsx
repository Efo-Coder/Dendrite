import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { MoveLeft, MoveRight } from 'lucide-react';
import { LOGO_SRC } from '../config/brand';

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.12em', color: 'var(--ink-dim)', marginBottom: '56px' }}>
          Last updated: June 2, 2026
        </p>

        <div style={{ fontFamily: 'var(--serif-body)', fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--ink-mid)', display: 'flex', flexDirection: 'column', gap: '48px' }}>

          <Section title="1. Acceptance of Terms">
            <p>By creating an account or using Dendrite ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. These terms constitute a legally binding agreement between you and Dendrite.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Dendrite is a web-based note-taking application that allows users to create, organize, and manage personal notes. The Service is provided "as is" and may be updated, modified, or discontinued at any time with reasonable notice.</p>
          </Section>

          <Section title="3. Account Registration">
            <p>To use Dendrite, you must create an account with a valid email address. You are responsible for:</p>
            <ul>
              <li>maintaining the confidentiality of your login credentials</li>
              <li>all activity that occurs under your account</li>
              <li>notifying us immediately of any unauthorized use of your account</li>
            </ul>
            <p>You must be at least 16 years of age to use the Service. By registering, you confirm that you meet this requirement.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to use Dendrite to:</p>
            <ul>
              <li>violate any applicable law or regulation</li>
              <li>store, share, or transmit content that is illegal, harmful, threatening, abusive, defamatory, or obscene</li>
              <li>infringe the intellectual property rights of others</li>
              <li>attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>distribute malware, spam, or automated scripts</li>
              <li>interfere with or disrupt the integrity or performance of the Service</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these rules without prior notice.</p>
          </Section>

          <Section title="5. Your Content">
            <p>You retain full ownership of the notes and content you create in Dendrite. By using the Service, you grant Dendrite a limited, non-exclusive license to store and display your content solely for the purpose of providing the Service to you.</p>
            <p>We do not claim ownership over your content and will never use it for advertising, training AI models, or sharing with third parties without your consent.</p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>All elements of the Dendrite platform — including the software, design, logos, and brand — are the exclusive property of Dendrite and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the platform without our prior written permission.</p>
          </Section>

          <Section title="7. Subscription & Billing">
            <p>Dendrite offers both a free tier and paid subscription plans. Paid features are billed in advance on a monthly basis. By subscribing, you authorize us to charge your payment method for the selected plan.</p>
            <p>Subscriptions auto-renew unless cancelled before the renewal date. Refunds are issued at our discretion and are generally not provided for partial billing periods. We reserve the right to change pricing with 30 days' notice.</p>
          </Section>

          <Section title="8. Service Availability">
            <p>We strive to keep Dendrite available at all times but do not guarantee uninterrupted service. We may perform scheduled maintenance that temporarily makes the Service unavailable. We are not liable for any loss resulting from downtime, data loss, or service interruptions.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Dendrite shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of data, loss of profits, or business interruption — arising from your use of or inability to use the Service, even if we have been advised of the possibility of such damages.</p>
            <p>Our total liability to you for any claim arising from these terms or your use of the Service shall not exceed the amount you paid to us in the 12 months preceding the claim.</p>
          </Section>

          <Section title="10. Termination">
            <p>You may delete your account at any time from the account settings. We may suspend or terminate your account if you violate these Terms of Service.</p>
            <p>Upon termination, your right to use the Service ceases immediately. We will delete your data in accordance with our Privacy Policy.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>These Terms of Service are governed by and construed in accordance with the laws of Germany. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts located in Germany.</p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>We may update these Terms of Service from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. Your continued use of the Service after that date constitutes acceptance of the updated terms.</p>
          </Section>

          <Section title="13. Contact">
            <p>For questions regarding these Terms of Service, please contact us at:</p>
            <p style={{ marginTop: '12px' }}>
              <strong>Dendrite</strong><br />
              Email: <a href="mailto:legal@dendrite-notes.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>legal@dendrite-notes.com</a>
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
          <Link to="/privacy" className="btn-ghost" style={{ padding: '12px 32px 13px', gap: '8px' }}>
            Privacy Policy
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
