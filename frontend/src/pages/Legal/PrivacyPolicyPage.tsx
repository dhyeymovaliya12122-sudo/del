import React from 'react';
import { SaaSNavbar } from '../../components/common/SaaSNavbar';
import { SaaSFooter } from '../../components/common/SaaSFooter';
import { Shield, Lock, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  return (
    <div style={{ background: '#070b14', minHeight: '100vh', color: '#F1F5F9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SaaSNavbar currentPath="privacy" onNavigate={onNavigate} />

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
              color: '#10b981',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <Shield size={14} />
            <span>Data Protection and Privacy</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.8px' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Last revised: October 11, 2026. Effective immediately for all platform instances.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, lineHeight: 1.7, color: '#cbd5e1', fontSize: 15 }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              1. Overview and Architecture Principles
            </h2>
            <p>
              Nexus Chat Automation Engine operates under a local-first, privacy-by-design paradigm.
              We provide software infrastructure that allows enterprise tenants to manage messaging sessions,
              dispatch transactional notifications, and automate conversational workflows. All cryptographic
              keys and authentication tokens remain within your isolated tenant storage.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              2. Data We Collect and Process
            </h2>
            <p>
              Depending on whether you operate the cloud-hosted edition or a sovereign self-hosted installation,
              we process the following categories of operational telemetry:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>
                <strong style={{ color: '#ffffff' }}>Account Metadata:</strong> Tenant identifiers, administrative usernames,
                hashed authentication passwords, and assigned user roles.
              </li>
              <li>
                <strong style={{ color: '#ffffff' }}>Session State:</strong> Multi-device authentication credentials
                (session tokens), connection lifecycle status, and ping telemetry.
              </li>
              <li>
                <strong style={{ color: '#ffffff' }}>Message Telemetry:</strong> Message delivery timestamps, acknowledgment ticks,
                failure error codes, and rate-limiting queue lengths.
              </li>
              <li>
                <strong style={{ color: '#ffffff' }}>Contact Records:</strong> Phone numbers formatted in E.164 standard, associated
                tags, and opt-out preferences stored inside your local IndexedDB and tenant database.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              3. Message Content and End-to-End Encryption
            </h2>
            <p>
              Messages transmitted through this gateway are encrypted in transit using the Signal Protocol.
              Message payloads dispatched through your queues are stored in your selected local
              or dedicated tenant database. We do not sell, inspect, or monetize your customer conversations or contact lists.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              4. Data Retention and Deletion
            </h2>
            <p>
              You maintain sovereign ownership of your data at all times. You can trigger complete conversation purges,
              export full JSON snapshots, or delete connected messaging instances at any moment through the Management Console.
              When an instance is deleted, associated session credentials and local browser caches are destroyed immediately.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              5. Compliance and Opt-Out Enforcement
            </h2>
            <p>
              Our platform incorporates mandatory opt-out filtering. When a recipient submits an unsubscribe request
              (such as STOP or UNSUBSCRIBE), their E.164 number is immediately placed on the exclusion registry to
              prevent further automated dispatches in compliance with international telecommunication standards.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
              6. Contact Information
            </h2>
            <p>
              For privacy inquiries, audit requests, or data export assistance, contact our technical privacy team:
            </p>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 18, marginTop: 12 }}>
              <div style={{ color: '#ffffff', fontWeight: 600 }}>Privacy and Security Operations</div>
              <div style={{ color: '#94a3b8', fontSize: 14 }}>privacy@nexus-engine.internal</div>
            </div>
          </section>
        </div>
      </main>

      <SaaSFooter onNavigate={onNavigate} />
    </div>
  );
};

export default PrivacyPolicyPage;
