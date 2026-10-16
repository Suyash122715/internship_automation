import React, { useState } from 'react';
import { GraduationCap, Plus, Trash2, Save, BookOpen } from 'lucide-react';

export default function EducationSection({ formData, onChange, onSave, saving, setFormData }) {
  const [newEdu, setNewEdu] = useState({
    institution: '',
    degree: '',
    field_of_study: '',
    start_year: '',
    end_year: '',
    grade: '',
    activities: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddEducation = () => {
    if (!newEdu.institution.trim()) return;
    const history = [...(formData.education_history || []), { ...newEdu }];
    setFormData(prev => ({ ...prev, education_history: history }));
    setNewEdu({
      institution: '',
      degree: '',
      field_of_study: '',
      start_year: '',
      end_year: '',
      grade: '',
      activities: ''
    });
    setShowAddForm(false);
  };

  const handleRemoveEducation = (index) => {
    const history = (formData.education_history || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, education_history: history }));
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
            Education Background
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            College, degree, major/branch, graduation year, and GPA metrics
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem' }}
        >
          <Save size={14} />
          <span>{saving ? 'Saving...' : 'Save Education'}</span>
        </button>
      </div>

      {/* Primary University / College Info */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: '1.25rem',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GraduationCap size={16} /> Primary University / Institution
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">College / University *</label>
            <input
              type="text"
              name="college"
              value={formData.college || ''}
              onChange={onChange}
              placeholder="e.g. Stanford University"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Degree *</label>
            <input
              type="text"
              name="degree"
              value={formData.degree || ''}
              onChange={onChange}
              placeholder="e.g. Bachelor of Science (B.S.)"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Branch / Major *</label>
            <input
              type="text"
              name="branch"
              value={formData.branch || ''}
              onChange={onChange}
              placeholder="e.g. Computer Science"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Graduation Year</label>
            <input
              type="number"
              name="graduation_year"
              value={formData.graduation_year || ''}
              onChange={onChange}
              placeholder="e.g. 2026"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">CGPA / GPA</label>
            <input
              type="number"
              step="0.01"
              name="cgpa"
              value={formData.cgpa || ''}
              onChange={onChange}
              placeholder="e.g. 3.85 or 9.2"
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Additional Education History List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Additional Degrees or High School (Optional)
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
          >
            <Plus size={14} />
            <span>{showAddForm ? 'Cancel' : 'Add Degree'}</span>
          </button>
        </div>

        {showAddForm && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Institution</label>
                <input
                  type="text"
                  value={newEdu.institution}
                  onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                  placeholder="Institution name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Degree / Certificate</label>
                <input
                  type="text"
                  value={newEdu.degree}
                  onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                  placeholder="e.g. High School Diploma"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Field of Study</label>
                <input
                  type="text"
                  value={newEdu.field_of_study}
                  onChange={(e) => setNewEdu({ ...newEdu, field_of_study: e.target.value })}
                  placeholder="e.g. Science & Math"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Year Range / Grade</label>
                <input
                  type="text"
                  value={newEdu.grade}
                  onChange={(e) => setNewEdu({ ...newEdu, grade: e.target.value })}
                  placeholder="e.g. 2020 - 2022"
                  className="form-input"
                />
              </div>
            </div>
            <button
              onClick={handleAddEducation}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', marginTop: '0.5rem' }}
            >
              Add to History
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(formData.education_history || []).map((edu, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {edu.institution}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {edu.degree} {edu.field_of_study ? `• ${edu.field_of_study}` : ''} {edu.grade ? `(${edu.grade})` : ''}
                </div>
              </div>
              <button
                onClick={() => handleRemoveEducation(idx)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                title="Remove"
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
