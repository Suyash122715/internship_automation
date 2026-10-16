import React, { useState } from 'react';
import {
  X,
  User,
  Building,
  Mail,
  Globe,
  Shield,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Info
} from 'lucide-react';
import { createContact } from '../../services/api';

const Linkedin = ({ size = 16, color = "currentColor", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const VERIFICATION_OPTIONS = [
  {
    value: 'VERIFIED',
    label: 'Verified',
    description: 'Confirmed via official company page or direct communication',
    color: '#10b981',
    badge: 'badge-success',
    icon: ShieldCheck,
  },
  {
    value: 'PUBLIC',
    label: 'Publicly Listed',
    description: 'Found on a public source (LinkedIn public profile, company website)',
    color: '#818cf8',
    badge: 'badge-purple',
    icon: Shield,
  },
  {
    value: 'INFERRED',
    label: 'Inferred / Unverified',
    description: 'Derived algorithmically — NOT confirmed; may be incorrect',
    color: '#f59e0b',
    badge: 'badge-warning',
    icon: AlertTriangle,
  },
  {
    value: 'UNKNOWN',
    label: 'Unknown',
    description: 'Source unknown or unclassifiable',
    color: '#6b7280',
    badge: 'badge-gray',
    icon: HelpCircle,
  },
];

const CONFIDENCE_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

export default function AddContactModal({ onClose, onCreated, prefillCompany = '' }) {
  const [form, setForm] = useState({
    name: '',
    company: prefillCompany,
    role: '',
    email: '',
    linkedin: '',
    profile_url: '',
    source: '',
    source_url: '',
    verification_status: 'UNKNOWN',
    confidence_level: 'UNKNOWN',
    discovery_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) {
      setError('Name and Company are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form };
      // Store empty strings as null — never pass empty email as a "real" address
      if (!payload.email.trim()) payload.email = null;
      if (!payload.linkedin.trim()) payload.linkedin = null;
      if (!payload.profile_url.trim()) payload.profile_url = null;
      if (!payload.source_url.trim()) payload.source_url = null;
      if (!payload.discovery_notes.trim()) payload.discovery_notes = null;

      const created = await createContact(payload);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create contact.');
    } finally {
      setLoading(false);
    }
  };

  const selectedVerification = VERIFICATION_OPTIONS.find(o => o.value === form.verification_status);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '640px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: 'var(--accent-primary-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>
                Add Recruiter / HR Contact
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Batch 7 — Real data only. Never fabricated.
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Truthfulness notice */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(99, 102, 241, 0.08)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          <Info size={15} color="#818cf8" />
          <span>
            Only enter information from real, citable sources. Leave fields blank if unknown — never guess.
            Set Verification Status accurately.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#f87171',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Full Name <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Jane Smith"
                required
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Company <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={e => update('company', e.target.value)}
                placeholder="Stripe"
                required
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Role / Title
            </label>
            <input
              type="text"
              value={form.role}
              onChange={e => update('role', e.target.value)}
              placeholder="Technical Recruiter, HR Manager…"
              style={{
                width: '100%', padding: '0.6rem 0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Email <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank if unknown)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="jane@company.com"
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                LinkedIn URL
              </label>
              <div style={{ position: 'relative' }}>
                <Linkedin size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="url"
                  value={form.linkedin}
                  onChange={e => update('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Source
              </label>
              <input
                type="text"
                value={form.source}
                onChange={e => update('source', e.target.value)}
                placeholder="LinkedIn, Company Website, Manual…"
                style={{
                  width: '100%', padding: '0.6rem 0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Source URL
              </label>
              <div style={{ position: 'relative' }}>
                <Globe size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="url"
                  value={form.source_url}
                  onChange={e => update('source_url', e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Verification Status — PRD-mandated explicit classification */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Verification Status <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {VERIFICATION_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = form.verification_status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('verification_status', opt.value)}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? `1px solid ${opt.color}` : '1px solid var(--border-subtle)',
                      background: isSelected ? `${opt.color}18` : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}
                  >
                    <Icon size={15} color={isSelected ? opt.color : 'var(--text-muted)'} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? opt.color : 'var(--text-primary)' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confidence Level */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Confidence Level
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {CONFIDENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('confidence_level', opt.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: form.confidence_level === opt.value ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                    background: form.confidence_level === opt.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: form.confidence_level === opt.value ? 600 : 400,
                    color: form.confidence_level === opt.value ? '#818cf8' : 'var(--text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discovery notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Discovery Notes
            </label>
            <textarea
              value={form.discovery_notes}
              onChange={e => update('discovery_notes', e.target.value)}
              rows={2}
              placeholder="e.g. Found via LinkedIn search for Stripe University Recruiter"
              style={{
                width: '100%', padding: '0.6rem 0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '0.85rem',
                fontFamily: 'inherit', resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Inferred email warning */}
          {form.verification_status === 'INFERRED' && form.email && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: '#fbbf24',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>
                You have entered an email with <strong>INFERRED</strong> status. This indicates the address was guessed or pattern-matched and may not be correct. It will be clearly labelled as INFERRED in all views and emails.
              </span>
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={15} /> {loading ? 'Saving…' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
