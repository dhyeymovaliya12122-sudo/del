import React, { useState } from 'react';
import { SaaSNavbar } from '../../components/common/SaaSNavbar';
import { SaaSFooter } from '../../components/common/SaaSFooter';
import {
  Calendar, Clock, Shield, CheckCircle2, ArrowRight, Sparkles,
  Building, Mail, User, Phone, MessageSquare, Send, Check, X
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface ContactDemoPageProps {
  onNavigate: (path: string) => void;
}

export const ContactDemoPage: React.FC<ContactDemoPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    phone: '',
    fleetSize: '5-25 Numbers',
    useCase: 'Marketing & Customer Notifications',
    date: 'Tomorrow, Oct 1',
    timeSlot: '02:00 PM EST',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const dates = [
    'Today, Sep 30',
    'Tomorrow, Oct 1',
    'Thursday, Oct 2',
    'Friday, Oct 3',
    'Monday, Oct 6',
  ];

  const timeSlots = [
    '10:00 AM EST',
    '11:30 AM EST',
    '02:00 PM EST',
    '03:30 PM EST',
    '05:00 PM EST',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.company.trim()) {
      setErrorMsg('Please complete all required fields (Name, Work Email, Company).');
      soundEffects.playPopSound();
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setErrorMsg('Please provide a valid corporate email address.');
      soundEffects.playPopSound();
      return;
    }

    setErrorMsg('');
    setLoading(true);
    soundEffects.playPopSound();

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      soundEffects.playReconnectedChime();
    }, 1200);
  };

  return (
    <div style={{ background: '#050D1E', minHeight: '100vh', color: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <SaaSNavbar currentPath="contact" onNavigate={onNavigate} />

      {/* Main Section */}
      <section style={{ paddingTop: 130, paddingBottom: 100, maxWidth: 1140, margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              marginBottom: 16,
            }}
          >
            <Calendar size={14} color="#F59E0B" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FCD34D', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              Schedule a Technical Architecture Demo
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-1px', color: '#FFFFFF' }}>
            Experience Quantum Messaging Fleet in Action
          </h1>
          <p style={{ fontSize: 16.5, color: '#CBD5E1', maxWidth: 640, margin: '0 auto', lineHeight: 1.65 }}>
            Book a 30-minute interactive live walkthrough with our Principal Systems Engineers. See the visual flow builder, anti-ban pacing, and 3D disconnection alerts live.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 40, alignItems: 'start' }}>
          {/* Left Column: Form Card with 3D Depth */}
          <div
            style={{
              background: '#0a162d',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              borderRadius: 8,
              padding: 36,
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '2px solid #F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 0 35px rgba(245, 158, 11, 0.45)',
                  }}
                >
                  <CheckCircle2 size={38} color="#FCD34D" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 10px', color: '#FFFFFF' }}>
                  Architecture Demo Confirmed!
                </h3>
                <p style={{ fontSize: 14.5, color: '#CBD5E1', lineHeight: 1.6, marginBottom: 24 }}>
                  We've reserved your session for <strong style={{ color: '#FCD34D' }}>{formData.date} at {formData.timeSlot}</strong>. A calendar invite and Google Meet link have been sent to <strong style={{ color: '#FFFFFF' }}>{formData.email}</strong>.
                </p>

                <div style={{ background: 'rgba(5, 13, 30, 0.7)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 18, borderRadius: 8, marginBottom: 24, textAlign: 'left', fontSize: 13, color: '#F8FAFC' }}>
                  <div>Company: <strong style={{ color: '#FCD34D' }}>{formData.company}</strong></div>
                  <div style={{ marginTop: 6 }}>Fleet Target: <strong>{formData.fleetSize}</strong></div>
                  <div style={{ marginTop: 6 }}>Host: <strong>Julian Vance (Lead Solutions Architect)</strong></div>
                </div>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    onNavigate('app');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 6,
                    background: '#F59E0B',
                    color: '#050D1E',
                    fontWeight: 800,
                    fontSize: 14.5,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Enter Cloud Management Console →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 20px', color: '#FFFFFF' }}>
                  Reserve Demo Slot
                </h3>

                {errorMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: 13, marginBottom: 18 }}>
                    {errorMsg}
                  </div>
                )}

                {/* Name & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Chen"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(5, 13, 30, 0.85)',
                        border: '1px solid rgba(245, 158, 11, 0.22)',
                        color: '#FFFFFF',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                      Corporate Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@enterprise.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(5, 13, 30, 0.85)',
                        border: '1px solid rgba(245, 158, 11, 0.22)',
                        color: '#FFFFFF',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Company & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nexus Tech Inc."
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(5, 13, 30, 0.85)',
                        border: '1px solid rgba(245, 158, 11, 0.22)',
                        color: '#FFFFFF',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                      Direct Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 019-2834"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(5, 13, 30, 0.85)',
                        border: '1px solid rgba(245, 158, 11, 0.22)',
                        color: '#FFFFFF',
                        fontSize: 13.5,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Fleet Size Selection */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Anticipated Fleet Scale
                  </label>
                  <select
                    value={formData.fleetSize}
                    onChange={e => setFormData({ ...formData, fleetSize: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#050D1E',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="1-5 Numbers">1 - 5 Phone Numbers (Starter)</option>
                    <option value="5-25 Numbers">5 - 25 Phone Numbers (Professional)</option>
                    <option value="25-100 Numbers">25 - 100 Phone Numbers (Enterprise Fleet)</option>
                    <option value="100+ Enterprise">100+ Phone Numbers (Global Sovereign VPC)</option>
                  </select>
                </div>

                {/* Interactive Date Picker */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                    Select Preferred Date:
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {dates.map(d => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => {
                          setFormData({ ...formData, date: d });
                          soundEffects.playPopSound();
                        }}
                        className="btn-3d-elastic"
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: formData.date === d ? '#F59E0B' : 'rgba(5, 13, 30, 0.7)',
                          color: formData.date === d ? '#050D1E' : '#CBD5E1',
                          border: formData.date === d ? '1px solid #FCD34D' : '1px solid rgba(245, 158, 11, 0.2)',
                          boxShadow: formData.date === d ? '0 4px 15px rgba(245, 158, 11, 0.35)' : 'none',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Time Slot Picker */}
                <div style={{ marginBottom: 26 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 8 }}>
                    Select Preferred Time Slot:
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {timeSlots.map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => {
                          setFormData({ ...formData, timeSlot: t });
                          soundEffects.playPopSound();
                        }}
                        className="btn-3d-elastic"
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: formData.timeSlot === t ? '#FCD34D' : 'rgba(5, 13, 30, 0.7)',
                          color: formData.timeSlot === t ? '#050D1E' : '#CBD5E1',
                          border: formData.timeSlot === t ? '1px solid #FCD34D' : '1px solid rgba(245, 158, 11, 0.2)',
                          boxShadow: formData.timeSlot === t ? '0 4px 15px rgba(252, 211, 77, 0.35)' : 'none',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: 6,
                    background: '#F59E0B',
                    color: '#050D1E',
                    fontWeight: 800,
                    fontSize: 15,
                    border: 'none',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {loading ? (
                    <span>Reserving Session...</span>
                  ) : (
                    <>
                      <span>Confirm 1-on-1 Architecture Demo</span>
                      <ArrowRight size={17} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Highlights & Social Proof with 3D Depth */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              className="card-3d-lift shine-3d-sheen"
              style={{
                background: 'linear-gradient(145deg, rgba(10, 22, 45, 0.85) 0%, rgba(6, 14, 30, 0.9) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                borderRadius: 20,
                padding: 30,
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(245, 158, 11, 0.08)',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', color: '#FFFFFF' }}>
                What We Will Cover in Your Live Session:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Live Multi-Tenant Container Sandbox Architecture',
                  'Visual Chatbot Flow Engine & Fallback Logic',
                  'Anti-Ban AI Human Warmup Pacing Demo',
                  'Live Demonstration of the 3D Disconnection Alert Center',
                  'Custom CRM & Webhook Ingestion (Salesforce, HubSpot)',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#E2E8F0' }}>
                    <CheckCircle2 size={17} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="card-3d-lift shine-3d-sheen"
              style={{
                background: 'linear-gradient(145deg, rgba(10, 22, 45, 0.85) 0%, rgba(6, 14, 30, 0.9) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                borderRadius: 20,
                padding: 30,
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(245, 158, 11, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #FCD34D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#050D1E', boxShadow: '0 0 16px rgba(245, 158, 11, 0.4)' }}>
                  JV
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#FFFFFF' }}>Dr. Julian Vance</div>
                  <div style={{ fontSize: 12, color: '#FCD34D', fontWeight: 600 }}>VP of Solutions Architecture, Nexus Cloud</div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
                "We walk you through real stress tests simulating 10,000 messages/sec and show you how container isolation ensures 100% uptime with zero account bans."
              </p>
            </div>
          </div>
        </div>
      </section>

      <SaaSFooter onNavigate={onNavigate} />
    </div>
  );
};

export default ContactDemoPage;
