import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Building,
  Briefcase,
  MapPin,
  Globe,
  Tag,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createJob } from '../../services/api';

export default function AddJobModal({ onClose, onJobCreated }) {
  const [formData, setFormData] = useState({
    company: '',
    title: '',
    location: '',
    workplace_type: 'Remote',
    employment_type: 'Internship',
    salary_or_stipend: '',
    application_url: '',
    source: 'Manual Import',
    description: '',
    skills_input: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.title.trim()) {
      setErrorMsg('Company and Title are required fields.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const skillsArray = formData.skills_input
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        company: formData.company.trim(),
        title: formData.title.trim(),
        location: formData.location.trim() || null,
        workplace_type: formData.workplace_type || null,
        employment_type: formData.employment_type || null,
        salary_or_stipend: formData.salary_or_stipend.trim() || null,
        application_url: formData.application_url.trim() || null,
        source: formData.source.trim() || 'Manual Import',
        description: formData.description.trim() || null,
        skills: skillsArray,
        status: 'DISCOVERED'
      };

      const created = await createJob(payload);
      if (onJobCreated) {
        onJobCreated(created);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add job.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content modal-content-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--accent-primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
            }}>
              <PlusCircle size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Add Authentic Job Opportunity
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Manually record a posting from LinkedIn, Indeed, or career sites
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#f87171',
                fontSize: '0.82rem'
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Google, Microsoft, Stripe"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Job / Role Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Software Engineering Intern (Summer 2026)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. New York, NY / Remote"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Workplace Mode</label>
                <select
                  className="form-select"
                  value={formData.workplace_type}
                  onChange={(e) => setFormData({ ...formData, workplace_type: e.target.value })}
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Employment Type</label>
                <select
                  className="form-select"
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                >
                  <option value="Internship">Internship</option>
                  <option value="Co-op">Co-op</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Apprenticeship">Apprenticeship</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Source Platform</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. LinkedIn, Handshake, Indeed, Company Site"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Compensation (if disclosed)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. $45/hr, $8,000/mo stipend"
                  value={formData.salary_or_stipend}
                  onChange={(e) => setFormData({ ...formData, salary_or_stipend: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Official Application URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://jobs.lever.co/company/... or https://boards.greenhouse.io/..."
                value={formData.application_url}
                onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Skills & Technologies (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Python, React, TypeScript, Docker, SQL"
                value={formData.skills_input}
                onChange={(e) => setFormData({ ...formData, skills_input: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Full Job Description</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="Paste the genuine job description text here..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving Job...
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} /> Add to Database
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
