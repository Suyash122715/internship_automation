import React, { useState } from 'react';
import { Code, Share2, Globe, Award, Plus, Trash2, Save, Link as LinkIcon } from 'lucide-react';

export default function LinksAndCertsSection({ formData, onChange, onSave, saving, setFormData }) {
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({ name: '', issuer: '', issue_date: '', credential_url: '' });

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ label: '', url: '' });

  const handleAddCert = () => {
    if (!certForm.name.trim()) return;
    const updated = [...(formData.certifications || []), { ...certForm }];
    setFormData(prev => ({ ...prev, certifications: updated }));
    setCertForm({ name: '', issuer: '', issue_date: '', credential_url: '' });
    setShowCertForm(false);
  };

  const handleRemoveCert = (index) => {
    const updated = (formData.certifications || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, certifications: updated }));
  };

  const handleAddLink = () => {
    if (!linkForm.url.trim()) return;
    const updated = [...(formData.other_links || []), { ...linkForm }];
    setFormData(prev => ({ ...prev, other_links: updated }));
    setLinkForm({ label: '', url: '' });
    setShowLinkForm(false);
  };

  const handleRemoveLink = (index) => {
    const updated = (formData.other_links || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, other_links: updated }));
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
            Online Links & Certifications
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            Social profiles, portfolio links, and verified technical certifications
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem' }}
        >
          <Save size={14} />
          <span>{saving ? 'Saving...' : 'Save Links'}</span>
        </button>
      </div>

      {/* Primary Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Code size={14} /> GitHub Profile URL
          </label>
          <input
            type="text"
            name="github"
            value={formData.github || ''}
            onChange={onChange}
            placeholder="https://github.com/username"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Share2 size={14} color="#38bdf8" /> LinkedIn Profile URL
          </label>
          <input
            type="text"
            name="linkedin"
            value={formData.linkedin || ''}
            onChange={onChange}
            placeholder="https://linkedin.com/in/username"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Globe size={14} color="#34d399" /> Portfolio / Website URL
          </label>
          <input
            type="text"
            name="portfolio"
            value={formData.portfolio || ''}
            onChange={onChange}
            placeholder="https://myportfolio.dev"
            className="form-input"
          />
        </div>
      </div>

      {/* Certifications Section */}
      <div style={{ marginBottom: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={16} color="#fbbf24" /> Certifications ({formData.certifications?.length || 0})
          </span>
          <button
            onClick={() => setShowCertForm(!showCertForm)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            <Plus size={14} /> {showCertForm ? 'Cancel' : 'Add Certification'}
          </button>
        </div>

        {showCertForm && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Certification Name *</label>
                <input
                  type="text"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  placeholder="e.g. AWS Certified Developer"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Issuing Organization</label>
                <input
                  type="text"
                  value={certForm.issuer}
                  onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                  placeholder="e.g. Amazon Web Services"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Issue Date</label>
                <input
                  type="text"
                  value={certForm.issue_date}
                  onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                  placeholder="e.g. 2025"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Credential Verification URL</label>
                <input
                  type="text"
                  value={certForm.credential_url}
                  onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })}
                  placeholder="https://credly.com/..."
                  className="form-input"
                />
              </div>
            </div>
            <button
              onClick={handleAddCert}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}
            >
              Add Certification
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(formData.certifications || []).map((cert, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {cert.name}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  {cert.issuer ? `• ${cert.issuer}` : ''} {cert.issue_date ? `(${cert.issue_date})` : ''}
                </span>
              </div>
              <button
                onClick={() => handleRemoveCert(idx)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
