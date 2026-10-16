import React, { useState } from 'react';
import { Award, Plus, X, Save, ShieldAlert } from 'lucide-react';

export default function SkillsSection({ formData, onSave, saving, setFormData }) {
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = (e) => {
    e?.preventDefault();
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    
    // Check duplicates
    if ((formData.skills || []).some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkill('');
      return;
    }
    
    const updated = [...(formData.skills || []), trimmed];
    setFormData(prev => ({ ...prev, skills: updated }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = (formData.skills || []).filter(s => s !== skillToRemove);
    setFormData(prev => ({ ...prev, skills: updated }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const popularSuggestions = [
    'Python', 'FastAPI', 'React', 'JavaScript', 'TypeScript', 'SQL', 'PostgreSQL',
    'SQLite', 'Node.js', 'Git', 'Docker', 'AWS', 'C++', 'Java', 'Data Structures',
    'REST APIs', 'Tailwind CSS', 'Machine Learning', 'Linux', 'Pandas'
  ];

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
            Technical & Domain Skills
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            Authoritative skills you possess. AI will only match against and emphasize these truthful skills.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ fontSize: '0.8rem' }}
        >
          <Save size={14} />
          <span>{saving ? 'Saving...' : 'Save Skills'}</span>
        </button>
      </div>

      {/* Input area */}
      <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter (e.g. Python, React, PostgreSQL)..."
          className="form-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={handleAddSkill}
          className="btn btn-secondary"
          style={{ whiteSpace: 'nowrap' }}
        >
          <Plus size={16} /> Add Skill
        </button>
      </form>

      {/* Current Skills List */}
      <div style={{
        minHeight: '90px',
        padding: '1rem',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Your Verified Skills ({formData.skills?.length || 0})
        </div>

        {formData.skills && formData.skills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {formData.skills.map((skill) => (
              <span key={skill} className="tag-chip">
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="tag-chip-remove"
                  title="Remove skill"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No skills added yet. Add your programming languages, tools, frameworks, and domain knowledge.
          </div>
        )}
      </div>

      {/* Quick Add Suggestions */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Quick Add Suggestions:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {popularSuggestions
            .filter(s => !(formData.skills || []).includes(s))
            .slice(0, 15)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), s] }));
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-normal)'
                }}
              >
                + {s}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
