import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Save, ExternalLink, Code, Layers } from 'lucide-react';

export default function ProjectsSection({ formData, onSave, saving, setFormData }) {
  const [showForm, setShowForm] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    role: '',
    description: '',
    technologies: '',
    github_url: '',
    live_url: '',
    duration: '',
    bullet_points: ''
  });

  const handleAddProject = () => {
    if (!projectForm.title.trim()) return;

    const newProject = {
      title: projectForm.title.trim(),
      role: projectForm.role.trim(),
      description: projectForm.description.trim(),
      technologies: projectForm.technologies.split(',').map(t => t.trim()).filter(Boolean),
      github_url: projectForm.github_url.trim(),
      live_url: projectForm.live_url.trim(),
      duration: projectForm.duration.trim(),
      bullet_points: projectForm.bullet_points.split('\n').map(b => b.trim()).filter(Boolean),
    };

    const updated = [...(formData.projects || []), newProject];
    setFormData(prev => ({ ...prev, projects: updated }));
    setProjectForm({
      title: '',
      role: '',
      description: '',
      technologies: '',
      github_url: '',
      live_url: '',
      duration: '',
      bullet_points: ''
    });
    setShowForm(false);
  };

  const handleRemoveProject = (index) => {
    const updated = (formData.projects || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, projects: updated }));
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
            Portfolio & Academic Projects
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            Key projects showcasing your practical engineering skills, technologies, and achievements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <Plus size={14} />
            <span>{showForm ? 'Cancel' : 'New Project'}</span>
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Projects'}</span>
          </button>
        </div>
      </div>

      {/* New Project Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: '#818cf8' }}>
            Add Project Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Project Title *</label>
              <input
                type="text"
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="e.g. Distributed Task Queue"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role / Responsibility</label>
              <input
                type="text"
                value={projectForm.role}
                onChange={(e) => setProjectForm({ ...projectForm, role: e.target.value })}
                placeholder="e.g. Lead Backend Engineer"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Technologies (comma-separated)</label>
              <input
                type="text"
                value={projectForm.technologies}
                onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                placeholder="e.g. Python, FastAPI, Redis, Docker"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration / Date</label>
              <input
                type="text"
                value={projectForm.duration}
                onChange={(e) => setProjectForm({ ...projectForm, duration: e.target.value })}
                placeholder="e.g. Oct 2025 - Dec 2025"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">GitHub Repository URL</label>
              <input
                type="text"
                value={projectForm.github_url}
                onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                placeholder="https://github.com/username/project"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Live Demo / Deployment URL</label>
              <input
                type="text"
                value={projectForm.live_url}
                onChange={(e) => setProjectForm({ ...projectForm, live_url: e.target.value })}
                placeholder="https://demo.project.com"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Description</label>
            <textarea
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              placeholder="Brief summary of the architecture and what the project accomplishes..."
              className="form-textarea"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bullet Points / Key Achievements (one per line)</label>
            <textarea
              value={projectForm.bullet_points}
              onChange={(e) => setProjectForm({ ...projectForm, bullet_points: e.target.value })}
              placeholder="• Built asynchronous worker pipeline handling 10k events/sec&#10;• Reduced latency by 45% using Redis caching"
              className="form-textarea"
              rows={3}
            />
          </div>

          <button
            type="button"
            onClick={handleAddProject}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}
          >
            Add Project to Profile
          </button>
        </div>
      )}

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(formData.projects || []).length > 0 ? (
          (formData.projects || []).map((project, idx) => (
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
                      {project.title}
                    </h4>
                    {project.role && (
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                        {project.role}
                      </span>
                    )}
                    {project.duration && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({project.duration})
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.4rem 0' }}>
                      {project.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                      title="GitHub Repository"
                    >
                      <Code size={16} />
                    </a>
                  )}
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                      title="Live Demo"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => handleRemoveProject(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '0.5rem' }}
                    title="Remove Project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Technologies */}
              {project.technologies && project.technologies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' }}>
                  {project.technologies.map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#a5b4fc',
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Bullets */}
              {project.bullet_points && project.bullet_points.length > 0 && (
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {project.bullet_points.map((bullet, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '0.2rem' }}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No projects added yet. Click <strong>New Project</strong> to add your software, research, or course projects.
          </div>
        )}
      </div>
    </div>
  );
}
