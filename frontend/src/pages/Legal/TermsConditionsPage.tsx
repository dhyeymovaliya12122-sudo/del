import React from 'react';
import { SaaSNavbar } from '../../components/common/SaaSNavbar';
import { SaaSFooter } from '../../components/common/SaaSFooter';
import { FileText, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface TermsConditionsPageProps {
  onNavigate: (path: string) => void;
}

export const TermsConditionsPage: React.FC<TermsConditionsPageProps> = ({ onNavigate }) => {
  return (
    <div style={{ background: '#070b14', minHeight: '100vh', color: '#F1F5F9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SaaSNavbar currentPath="terms" onNavigate={onNavigate} />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '120px 24px 80px' }}>
        <button
          onClick={() => onNavigate('landing')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 6,
            background: '#0f172a',
            border: '1px solid #1e293b',
            color: '#94a3b8',
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: 28, marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 6,
              background: '#0f172a',
              border: '1px solid #1e293b',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <FileText size={14} />
            <span>Legal Agreement</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.8px' }}>
            Terms and Conditions
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Last revised: October 11, 2026. Effective for all tenants and connected instances.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, lineHeight: 1.7, color: '#cbd5e1', fontSize: 15 }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, integrating, or running the Nexus Messaging Engine, you agree to comply with
              and be legally bound by these Terms and Conditions. If you are entering into this agreement on
              behalf of a company or organization, you represent that you possess the requisite authority to
              bind that entity.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              2. Acceptable Use and Anti-Spam Policy
            </h2>
            <p>
              Users are strictly prohibited from utilizing this platform for unlawful, harmful, or unsolicited messaging.
              In particular, you agree to:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>
                <strong style={{ color: '#ffffff' }}>Explicit Consent:</strong> Only send messages to recipients who have
                provided explicit, verifiable prior opt-in consent to receive communications from your organization.
              </li>
              <li>
                <strong style={{ color: '#ffffff' }}>Opt-Out Honoring:</strong> Promptly respect unsubscribe keywords and
                utilize the built-in compliance opt-out filters to cease communication immediately.
              </li>
              <li>
                <strong style={{ color: '#ffffff' }}>Third-Party Policies:</strong> Abide by upstream provider acceptable use
                policies and local telecommunications regulations governing bulk commercial dispatches.
              </li>
              <li>
                <strong style={{ color: '#ffffff' }}>No Malicious Content:</strong> Refrain from distributing phishing schemes,
                malware links, fraudulent promotions, or abusive content.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              3. Service Architecture and Availability
            </h2>
            <p>
              The platform utilizes standard WebSocket multi-device protocols to facilitate communication.
              While we engineer high-availability failover and rate-limiting queue controls to minimize downtime,
              we do not guarantee uninterrupted connectivity in scenarios where upstream carrier networks or upstream
              protocol revisions necessitate software maintenance.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              4. Subscription and Billing Terms
            </h2>
            <p>
              Subscriptions are billed in advance on a recurring monthly or annual basis depending on your selected plan.
              You may modify or cancel your subscription at any time via the billing management view. Upon cancellation,
              access continues through the end of the current paid billing cycle with zero termination fees.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              5. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, Nexus Messaging Engine and its contributors shall not
              be liable for any indirect, incidental, punitive, or consequential damages resulting from lost profits,
              account suspensions incurred through policy violations, or service interruptions arising from external carrier actions.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              6. Modifications to Terms
            </h2>
            <p>
              We reserve the right to amend these terms to reflect infrastructure enhancements or regulatory updates.
              Continued usage of the service following the publication of revised terms constitutes acceptance of those revisions.
            </p>
          </section>
        </div>
      </main>

      <SaaSFooter onNavigate={onNavigate} />
    </div>
  );
};

export default TermsConditionsPage;
