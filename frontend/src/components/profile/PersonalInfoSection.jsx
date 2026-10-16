import React from 'react';
import { User, Mail, Phone, MapPin, AlignLeft, Save } from 'lucide-react';

export default function PersonalInfoSection({ formData, onChange, onSave, saving }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
            Personal & Contact Information
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            Authoritative contact details used for application forms and recruiter outreach
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem' }}
        >
          <Save size={14} />
          <span>{saving ? 'Saving...' : 'Save Details'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={onChange}
              placeholder="e.g. Alex Rivera"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={onChange}
              placeholder="e.g. alex.rivera@example.com"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone || ''}
            onChange={onChange}
            placeholder="e.g. +1 (555) 019-2834"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Current Location (City, State/Country)</label>
          <input
            type="text"
            name="location"
            value={formData.location || ''}
            onChange={onChange}
            placeholder="e.g. San Francisco, CA"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label className="form-label">Professional Summary / Bio</label>
        <textarea
          name="bio"
          value={formData.bio || ''}
          onChange={onChange}
          placeholder="Brief summary of your academic background, core interests, and what internship roles you are aiming for..."
          className="form-textarea"
          rows={3}
        />
      </div>
    </div>
  );
}
