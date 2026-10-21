import React, { useState, useMemo } from 'react';
import { SaaSNavbar } from '../../components/common/SaaSNavbar';
import { SaaSFooter } from '../../components/common/SaaSFooter';
import {
  Check, Zap, Shield, Sparkles, HelpCircle, ChevronDown, ChevronUp,
  ArrowRight, Calculator, CheckCircle2, X
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface PricingPageProps {
  onNavigate: (path: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'INR'>('USD');
  const [volumeSlider, setVolumeSlider] = useState(150000); // monthly messages
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const rates = {
    USD: { symbol: '$', mult: 1 },
    EUR: { symbol: '€', mult: 0.92 },
    GBP: { symbol: '£', mult: 0.78 },
    INR: { symbol: '₹', mult: 83.5 },
  };

  const discountMultiplier = billingPeriod === 'annual' ? 0.75 : 1.0;

  const plans = [
    {
      name: 'Starter',
      badge: 'For Growing Teams',
      basePriceMonthly: 49,
      desc: 'Ideal for small businesses launching automated messaging & notifications.',
      features: [
        '3 Active Phone Numbers',
        'Up to 50,000 Messages / month',
        'Standard Rate Pacing (25 msg/sec)',
        'Basic Keyword Auto-Reply Bot',
        'CSV Contacts Import & Export',
        'Email Support (24h Response)',
      ],
      notIncluded: [
        'Custom Proxy IP Rotation',
        'Visual Branching Flow Builder',
        '3D Disconnection Alert Center',
        'Dedicated SLA 99.99%',
      ],
      popular: false,
      cta: 'Start 14-Day Free Trial',
    },
    {
      name: 'Professional',
      badge: 'ENTERPRISE RECOMMENDED',
      basePriceMonthly: 149,
      desc: 'Complete suite for high-volume outreach, intelligent chatbot flows, and multi-agent teams.',
      features: [
        '15 Active Phone Numbers',
        'Up to 500,000 Messages / month',
        'Turbo High-Speed Pacing (85 msg/sec)',
        'Visual Multi-Branch Chatbot Flow Builder',
        'Anti-Ban AI Human Warmup Engine',
        'Live 3D Disconnection Alert Telemetry',
        'Granular Delivery Status Analytics',
        'Priority 24/7 Live Chat Support',
      ],
      notIncluded: [
        'On-Premise Isolated VPC Cluster',
      ],
      popular: true,
      cta: 'Claim Pro Deployment →',
    },
    {
      name: 'Quantum Enterprise',
      badge: 'Maximum Scale & Security',
      basePriceMonthly: 499,
      desc: 'Tailored for Fortune 500 fleets requiring dedicated isolated VPS nodes, custom proxies, and SLAs.',
      features: [
        'Unlimited Phone Numbers',
        'Unlimited Monthly Message Dispatch',
        'Custom Proxy IP Subnet Allocation',
        'Full Multi-Tenant Admin & Sub-Admin Roles',
        '99.99% Guaranteed SLA with Penalties',
        'Custom Webhook & CRM Sync (Salesforce, HubSpot)',
        'Dedicated Technical Account Manager',
        'SOC2 Type II & HIPAA Compliance Package',
      ],
      notIncluded: [],
      popular: false,
      cta: 'Contact Enterprise Sales',
    },
  ];

  // Estimated Twilio/Meta cost comparison
  const calculatedSavings = useMemo(() => {
    // Standard Business Cloud API charges ~$0.045 to $0.075 per conversation
    const metaCloudCost = (volumeSlider / 1000) * 45;
    const nexusCost = (volumeSlider > 500000 ? 499 : volumeSlider > 50000 ? 149 : 49) * (billingPeriod === 'annual' ? 0.75 : 1.0);
    const savings = Math.max(0, metaCloudCost - nexusCost);
    return {
      metaCloudCost: Math.round(metaCloudCost),
      nexusCost: Math.round(nexusCost),
      savings: Math.round(savings),
      percentage: Math.min(92, Math.round((savings / metaCloudCost) * 100)),
    };
  }, [volumeSlider, billingPeriod]);

  const faqs = [
    {
      q: 'Can I connect my existing numbers without losing chat history?',
      a: 'Yes! Simply scan the QR code using your mobile companion app. The Nexus Chat Pro Engine links as an authorized companion session, keeping all your contacts, chat history, and active groups intact.',
    },
    {
      q: 'How does the Anti-Ban AI Warmup Engine protect my numbers?',
      a: 'Unlike naive bulk spammers, our algorithm emulates natural human typing pacing, message interval jitter (randomized micro-delays between 3-8 seconds), and gradually ramps message velocity over a 7-day warming curve.',
    },
    {
      q: 'What is the 3D Cosmic Disconnection Alert feature?',
      a: 'When an active companion socket drops due to phone battery or network severance, our dual-canvas WebGL shader alert triggers immediately in 3D, providing real-time telemetry and 1-click self-healing reconnection.',
    },
    {
      q: 'Can I cancel or change plans at any time?',
      a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription at any time with zero lock-in contracts. If you cancel, your account remains active until the end of your billing cycle.',
    },
    {
      q: 'Do you offer an on-premise or self-hosted deployment?',
      a: 'Yes, our Quantum Enterprise tier includes Docker and Kubernetes Helm charts for hosting in your own AWS, GCP, or Azure VPC for complete sovereign data governance.',
    },
  ];

  return (
    <div style={{ background: '#070b14', minHeight: '100vh', color: '#F1F5F9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SaaSNavbar currentPath="pricing" onNavigate={onNavigate} />

      {/* Header */}
      <section style={{ paddingTop: 130, paddingBottom: 50, textAlign: 'center', maxWidth: 900, margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            marginBottom: 20,
          }}
        >
          <Sparkles size={14} color="#10b981" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#10b981', letterSpacing: '0.5px' }}>
            Transparent & Scalable Pricing
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px', lineHeight: 1.15 }}>
          Predictable Cloud Pricing.{' '}
          <span style={{ color: '#10b981' }}>
            Zero Per-Message Fees.
          </span>
        </h1>
        <p style={{ fontSize: 17, color: '#94A3B8', maxWidth: 620, margin: '0 auto 36px' }}>
          Stop paying extortionate per-conversation charges to Meta or Twilio. Pay a flat monthly subscription and dispatch unlimited messages.
        </p>

        {/* Toggles: Monthly/Annual + Currency */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Billing period switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: 4,
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              onClick={() => {
                setBillingPeriod('monthly');
                soundEffects.playPopSound();
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: billingPeriod === 'monthly' ? '#10b981' : 'transparent',
                color: billingPeriod === 'monthly' ? '#070b14' : '#94A3B8',
                transition: 'all 0.15s ease',
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => {
                setBillingPeriod('annual');
                soundEffects.playPopSound();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: billingPeriod === 'annual' ? '#10b981' : 'transparent',
                color: billingPeriod === 'annual' ? '#070b14' : '#94A3B8',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Annual Billing</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  background: billingPeriod === 'annual' ? '#070b14' : '#10b981',
                  color: billingPeriod === 'annual' ? '#10b981' : '#070b14',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                SAVE 25%
              </span>
            </button>
          </div>

          {/* Currency Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {(['USD', 'EUR', 'GBP', 'INR'] as const).map(c => (
              <button
                key={c}
                onClick={() => {
                  setCurrency(c);
                  soundEffects.playPopSound();
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: currency === c ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: currency === c ? '#ffffff' : '#64748B',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING CARDS GRID ── */}
      <section style={{ maxWidth: 1220, margin: '0 auto 80px', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, alignItems: 'stretch' }}>
          {plans.map((p, idx) => {
            const sym = rates[currency].symbol;
            const price = Math.round(p.basePriceMonthly * discountMultiplier * rates[currency].mult);

            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  background: '#0f172a',
                  border: p.popular
                    ? '2px solid #10b981'
                    : '1px solid #1e293b',
                  borderRadius: 8,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Popular Badge */}
                {p.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#10b981',
                      color: '#070b14',
                      padding: '4px 12px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                    }}
                  >
                    RECOMMENDED
                  </div>
                )}

                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.popular ? '#10b981' : '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {p.badge}
                  </span>
                  <h3 style={{ fontSize: 26, fontWeight: 900, margin: '8px 0 10px', color: '#ffffff' }}>
                    {p.name}
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 1.6, margin: '0 0 24px', minHeight: 44 }}>
                    {p.desc}
                  </p>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 28 }}>
                    <span style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px' }}>
                      {sym}{price}
                    </span>
                    <span style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>
                      / month {billingPeriod === 'annual' && '(billed annually)'}
                    </span>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => {
                      if (p.name === 'Quantum Enterprise') {
                        onNavigate('contact');
                      } else {
                        onNavigate('app');
                      }
                      soundEffects.playPopSound();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: 6,
                      fontSize: 14.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: p.popular
                        ? '#10b981'
                        : '#1e293b',
                      color: p.popular ? '#070b14' : '#ffffff',
                      transition: 'all 0.15s ease',
                      marginBottom: 30,
                    }}
                  >
                    {p.cta}
                  </button>

                  {/* Features list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      What's Included:
                    </div>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#E2E8F0' }}>
                        <Check size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {p.notIncluded.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#475569' }}>
                        <X size={15} color="#475569" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── INTERACTIVE SAVINGS CALCULATOR SLIDER ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto 90px', padding: '0 32px' }}>
        <div
          className="card-3d-lift"
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: 32,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Calculator size={24} color="#10b981" />
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              Live Messaging ROI & Savings Calculator
            </h3>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 28px' }}>
            Compare your estimated monthly cost on Meta Cloud API / Twilio vs Nexus Chat Pro flat cloud subscription.
          </p>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Your Expected Monthly Message Volume:</span>
              <span style={{ color: '#10b981', fontSize: 18, fontWeight: 900, fontFamily: 'monospace' }}>
                {volumeSlider.toLocaleString()} messages/mo
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="2000000"
              step="10000"
              value={volumeSlider}
              onChange={e => setVolumeSlider(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 20, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Estimated Meta / Twilio Fee</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#FF6B35', fontFamily: 'monospace' }}>
                ${calculatedSavings.metaCloudCost.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>At ~$0.045 / conversation</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 20, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Nexus Chat Pro Flat Cost</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                ${calculatedSavings.nexusCost.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Zero per-message fees!</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 20, borderRadius: 16 }}>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>You Save Each Month</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
                ${calculatedSavings.savings.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginTop: 4 }}>
                ≈ {calculatedSavings.percentage}% Cost Reduction
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section style={{ maxWidth: 880, margin: '0 auto 100px', padding: '0 32px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, textAlign: 'center', margin: '0 0 40px' }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                }}
              >
                <button
                  onClick={() => {
                    setOpenFaq(isOpen ? null : i);
                    soundEffects.playPopSound();
                  }}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={20} color="#10b981" /> : <ChevronDown size={20} color="#64748B" />}
                </button>

                {isOpen && (
                  <div style={{ padding: '0 24px 22px', fontSize: 14.5, lineHeight: 1.7, color: '#94A3B8' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <SaaSFooter onNavigate={onNavigate} />
    </div>
  );
};

export default PricingPage;
