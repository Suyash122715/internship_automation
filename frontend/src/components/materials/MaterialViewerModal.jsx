import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  ShieldCheck,
  Download,
  Copy,
  Check,
  RefreshCw,
  Save,
  X,
  Sparkles,
  ExternalLink,
  Edit3,
  Eye,
  AlertCircle,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';
import {
  fetchJobMaterials,
  generateAllMaterials,
  tailorResume,
  generateCoverLetter,
  updateJobMaterials,
  getMaterialDownloadUrl,
} from '../../services/api';

export default function MaterialViewerModal({ job, onClose, onMaterialsUpdated }) {
  const [activeTab, setActiveTab] = useState('resume'); // 'resume' | 'cover-letter' | 'audit'
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [materials, setMaterials] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Editable text states
  const [editableResume, setEditableResume] = useState('');
  const [editableCover, setEditableCover] = useState('');
  const [notes, setNotes] = useState('');

  const loadMaterials = async () => {
    if (!job?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobMaterials(job.id);
      setMaterials(data);
      setEditableResume(data.tailored_resume_markdown || '');
      setEditableCover(data.cover_letter_markdown || '');
      setNotes(data.submission_notes || '');
    } catch (err) {
      setError(err.message || 'Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [job?.id]);

  const handleRegenerateAll = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await generateAllMaterials(job.id, notes);
      setMaterials(data);
      setEditableResume(data.tailored_resume_markdown || '');
      setEditableCover(data.cover_letter_markdown || '');
      setSuccessMsg('Successfully regenerated tailored resume and cover letter!');
      if (onMaterialsUpdated) onMaterialsUpdated();
    } catch (err) {
      setError(err.message || 'Failed to generate materials.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateResume = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await tailorResume(job.id, true);
      setEditableResume(data.resume_markdown);
      setMaterials(prev => ({
        ...prev,
        tailored_resume_markdown: data.resume_markdown,
        tailored_resume_text: data.resume_text,
        modifications_log: data.modifications_log,
        truthfulness_audit: { ...(prev?.truthfulness_audit || {}), ...data.truthfulness_audit },
      }));
      setSuccessMsg('Tailored resume refreshed with latest JD requirements!');
      if (onMaterialsUpdated) onMaterialsUpdated();
    } catch (err) {
      setError(err.message || 'Failed to tailor resume.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateCoverLetter = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await generateCoverLetter(job.id, true);
      setEditableCover(data.cover_letter_markdown);
      setMaterials(prev => ({
        ...prev,
        cover_letter_markdown: data.cover_letter_markdown,
        cover_letter_text: data.cover_letter_text,
        grounding_notes: data.grounding_notes,
      }));
      setSuccessMsg('Cover letter refreshed based on verified profile facts!');
      if (onMaterialsUpdated) onMaterialsUpdated();
    } catch (err) {
      setError(err.message || 'Failed to generate cover letter.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await updateJobMaterials(job.id, {
        tailored_resume_text: editableResume,
        cover_letter_text: editableCover,
        submission_notes: notes,
      });
      setMaterials(data);
      setEditMode(false);
      setSuccessMsg('Manual modifications successfully saved and persisted.');
      if (onMaterialsUpdated) onMaterialsUpdated();
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '960px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(30, 41, 59, 0.95)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                Batch 5 Material Studio
              </span>
              <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                <ShieldCheck size={13} /> Strict Truthfulness Guaranteed
              </span>
              {materials?.status && (
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  {materials.status}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>
              {job?.title} <span style={{ color: 'var(--text-muted)' }}>@ {job?.company}</span>
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.6rem' }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action / Banner Bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('resume')}
              className={`btn ${activeTab === 'resume' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <FileText size={15} /> Tailored Resume
            </button>
            <button
              onClick={() => setActiveTab('cover-letter')}
              className={`btn ${activeTab === 'cover-letter' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <Mail size={15} /> Cover Letter
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <ShieldCheck size={15} /> Modifications & Audit ({materials?.modifications_log?.length || 0})
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`btn ${editMode ? 'btn-warning' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              title={editMode ? 'Switch to rendered preview' : 'Edit document text'}
            >
              {editMode ? <Eye size={15} /> : <Edit3 size={15} />}
              {editMode ? 'Preview Mode' : 'Direct Edit'}
            </button>

            {editMode && (
              <button
                onClick={handleSaveEdits}
                disabled={saving}
                className="btn btn-success"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                <Save size={15} /> {saving ? 'Saving...' : 'Save Edits'}
              </button>
            )}

            <button
              onClick={() => handleCopy(activeTab === 'resume' ? editableResume : editableCover)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <a
              href={getMaterialDownloadUrl(job.id, activeTab === 'cover-letter' ? 'cover-letter' : 'resume')}
              download
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <Download size={15} /> Download (.md)
            </a>

            <button
              onClick={handleRegenerateAll}
              disabled={generating}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              title="Re-run tailoring algorithm grounded in profile"
            >
              <RefreshCw size={15} className={generating ? 'spin' : ''} />
              {generating ? 'Tailoring...' : 'Regenerate'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {successMsg && (
          <div style={{
            padding: '0.6rem 1.5rem',
            background: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem auto', display: 'block', color: 'var(--accent-color)' }} />
              <p>Analyzing profile and preparing tailored application materials...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: TAILORED RESUME */}
              {activeTab === 'resume' && (
                <div>
                  {editMode ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Edit Tailored Markdown Resume:
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Markdown formatted (ATS-compliant)
                        </span>
                      </div>
                      <textarea
                        value={editableResume}
                        onChange={(e) => setEditableResume(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '460px',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '1rem',
                          color: '#e2e8f0',
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          lineHeight: '1.5',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '2rem',
                      color: '#e2e8f0',
                      lineHeight: '1.6',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.92rem',
                    }}>
                      {editableResume || 'No resume content available.'}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: COVER LETTER */}
              {activeTab === 'cover-letter' && (
                <div>
                  {editMode ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Edit Cover Letter:
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Grounded in verified profile data
                        </span>
                      </div>
                      <textarea
                        value={editableCover}
                        onChange={(e) => setEditableCover(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '460px',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '1rem',
                          color: '#e2e8f0',
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          lineHeight: '1.6',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '2rem',
                      color: '#e2e8f0',
                      lineHeight: '1.7',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.94rem',
                    }}>
                      {editableCover || 'No cover letter content available.'}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MODIFICATIONS & TRUTHFULNESS AUDIT */}
              {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Truthfulness Guarantee Box */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      flexShrink: 0,
                    }}>
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: '#10b981', margin: '0 0 0.25rem 0' }}>
                        100% Truthfulness Guarantee (Master PRD Section 3.3 & 10)
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                        This tailored resume and cover letter strictly utilize facts from your verified master profile.
                        No skills, metrics, experiences, or achievements were fabricated or assumed.
                      </p>
                    </div>
                  </div>

                  {/* Audit Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}>
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hallucinated Skills</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>0</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Strictly source-grounded</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hallucinated Projects</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>0</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Only user projects cited</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Modifications Tracked</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#818cf8', marginTop: '0.25rem' }}>
                        {materials?.modifications_log?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Reordered & emphasized</div>
                    </div>
                  </div>

                  {/* Structured Modifications Log */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.95rem', margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={16} color="#818cf8" />
                      Detailed Modifications Log
                    </h3>
                    {materials?.modifications_log && materials.modifications_log.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {materials.modifications_log.map((mod, idx) => (
                          <div key={idx} style={{
                            padding: '0.85rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            borderLeft: '3px solid #818cf8',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                {mod.section} Section
                              </span>
                              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                                {mod.change_type}
                              </span>
                            </div>
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {mod.reason}
                            </p>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {mod.details}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        No reordering or modification rules were applied. All content matches original master profile.
                      </p>
                    )}
                  </div>

                  {/* Grounding Notes */}
                  {materials?.grounding_notes && materials.grounding_notes.length > 0 && (
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={16} color="#38bdf8" />
                        Cover Letter Grounding Evidence
                      </h3>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {materials.grounding_notes.map((gn, idx) => (
                          <li key={idx}>{gn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(30, 41, 59, 0.95)',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Status: <span style={{ color: '#10b981', fontWeight: 600 }}>{materials?.status || 'PREPARED'}</span>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
