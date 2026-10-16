import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Save, Building, Calendar, MapPin } from 'lucide-react';

export default function ExperienceSection({ formData, onSave, saving, setFormData }) {
  const [showForm, setShowForm] = useState(false);
  const [expForm, setExpForm] = useState({
    company: '',
    role: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    bullet_points: ''
  });

  const handleAddExperience = () => {
    if (!expForm.company.trim() || !expForm.role.trim()) return;

    const newExp = {
      company: expForm.company.trim(),
      role: expForm.role.trim(),
      location: expForm.location.trim(),
      start_date: expForm.start_date.trim(),
      end_date: expForm.is_current ? 'Present' : expForm.end_date.trim(),
      is_current: expForm.is_current,
      description: expForm.description.trim(),
      bullet_points: expForm.bullet_points.split('\n').map(b => b.trim()).filter(Boolean),
    };

    const updated = [...(formData.experience || []), newExp];
    setFormData(prev => ({ ...prev, experience: updated }));
    setExpForm({
      company: '',
      role: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      bullet_points: ''
    });
    setShowForm(false);
  };

  const handleRemoveExperience = (index) => {
    const updated = (formData.experience || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, experience: updated }));
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
            Work & Internship Experience
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            Past internships, part-time roles, open-source work, and leadership experiences
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <Plus size={14} />
            <span>{showForm ? 'Cancel' : 'Add Experience'}</span>
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Experience'}</span>
          </button>
        </div>
      </div>

      {/* New Experience Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: '#818cf8' }}>
            Add Experience Record
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Company / Organization *</label>
              <input
                type="text"
                value={expForm.company}
                onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role / Job Title *</label>
              <input
                type="text"
                value={expForm.role}
                onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                placeholder="e.g. Software Engineering Intern"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                value={expForm.location}
                onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
                placeholder="e.g. Remote or Seattle, WA"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="text"
                value={expForm.start_date}
                onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value })}
                placeholder="e.g. May 2025"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="text"
                disabled={expForm.is_current}
                value={expForm.is_current ? 'Present' : expForm.end_date}
                onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value })}
                placeholder="e.g. Aug 2025"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                id="is_current"
                checked={expForm.is_current}
                onChange={(e) => setExpForm({ ...expForm, is_current: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="is_current" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                I currently work here
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Key Responsibilities & Bullet Points (one per line)</label>
            <textarea
              value={expForm.bullet_points}
              onChange={(e) => setExpForm({ ...expForm, bullet_points: e.target.value })}
              placeholder="• Developed automated unit test suite increasing coverage from 60% to 92%&#10;• Collaborated with team of 5 engineers to deliver feature on schedule"
              className="form-textarea"
              rows={3}
            />
          </div>

          <button
            type="button"
            onClick={handleAddExperience}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}
          >
            Add Experience to Profile
          </button>
        </div>
      )}

      {/* Experience List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(formData.experience || []).length > 0 ? (
          (formData.experience || []).map((exp, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <h4 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>
                      {exp.role}
                    </h4>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {exp.company}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {exp.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={12} /> {exp.location}
                      </span>
                    )}
                    {(exp.start_date || exp.end_date) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> {exp.start_date || ''} - {exp.end_date || 'Present'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveExperience(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  title="Remove Experience"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Bullets */}
              {exp.bullet_points && exp.bullet_points.length > 0 && (
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {exp.bullet_points.map((bullet, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '0.2rem' }}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No work experience added yet. Click <strong>Add Experience</strong> to record internships or projects.
          </div>
        )}
      </div>
    </div>
  );
}
