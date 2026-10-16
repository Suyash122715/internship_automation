import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Building,
  MapPin,
  ExternalLink,
  Award,
  BookOpen,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check
} from 'lucide-react';

export default function MatchDetailModal({ matchData, loading, onClose, onOpenMaterials }) {
  const [activeSubTab, setActiveSubTab] = useState('summary'); // 'summary' | 'skills' | 'requirements' | 'raw_jd'

  if (!matchData && !loading) return null;

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 45) return '#f59e0b';
    if (score > 0) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content modal-content-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid var(--border-highlight)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontWeight: 700,
              fontSize: '1.2rem',
            }}>
              <Layers size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Job Compatibility & Qualification Breakdown
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                PRD Batch 4 • Deterministic, Reproducible, Evidence-Grounded Matching
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
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Analyzing JD requirements and computing compatibility score against your verified profile...
              </p>
            </div>
          ) : matchData ? (
            <>
              {/* Overall Score Header Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.6) 0%, rgba(17, 24, 39, 0.8) 100%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {/* Circular Score Gauge */}
                  <div style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: `conic-gradient(${getScoreColor(matchData.overall_score)} ${matchData.overall_score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 16px ${getScoreColor(matchData.overall_score)}30`,
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: '#111827',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: getScoreColor(matchData.overall_score) }}>
                        {Math.round(matchData.overall_score)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span className="badge" style={{
                        background: `${getScoreColor(matchData.overall_score)}20`,
                        color: getScoreColor(matchData.overall_score),
                        border: `1px solid ${getScoreColor(matchData.overall_score)}40`,
                        fontSize: '0.72rem',
                      }}>
                        {matchData.overall_score >= 70 ? 'Strong Match' : matchData.overall_score >= 45 ? 'Moderate Match' : 'Low Match'}
                      </span>
                      {matchData.status_updated && (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          Status Updated to ANALYZED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Match calculation methodology: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Deterministic Rule-Based</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span>Zero Hallucinations • Grounded in Profile & Source JD</span>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                <button
                  onClick={() => setActiveSubTab('summary')}
                  className={`filter-pill ${activeSubTab === 'summary' ? 'active' : ''}`}
                >
                  Score Breakdown
                </button>
                <button
                  onClick={() => setActiveSubTab('skills')}
                  className={`filter-pill ${activeSubTab === 'skills' ? 'active' : ''}`}
                >
                  Skills Matrix
                </button>
                <button
                  onClick={() => setActiveSubTab('requirements')}
                  className={`filter-pill ${activeSubTab === 'requirements' ? 'active' : ''}`}
                >
                  Parsed Requirements
                </button>
              </div>

              {/* TAB 1: SUMMARY & 5-DIMENSION BREAKDOWN */}
              {activeSubTab === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* 5-Dimension Progress Bars */}
                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      5-Dimension Compatibility Breakdown
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {[
                        { key: 'skills', label: 'Skills Alignment', weight: matchData.weights_used?.skills || 0.5 },
                        { key: 'education', label: 'Education & Degree', weight: matchData.weights_used?.education || 0.15 },
                        { key: 'experience', label: 'Experience & Projects', weight: matchData.weights_used?.experience || 0.15 },
                        { key: 'location', label: 'Location & Remote Fit', weight: matchData.weights_used?.location || 0.10 },
                        { key: 'role_relevance', label: 'Target Role Fit', weight: matchData.weights_used?.role_relevance || 0.10 },
                      ].map((dim) => {
                        const dimScore = matchData.breakdown?.[dim.key] || 0;
                        const color = getScoreColor(dimScore);
                        return (
                          <div key={dim.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {dim.label} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({Math.round(dim.weight * 100)}% weight)</span>
                              </span>
                              <span style={{ fontWeight: 700, color }}>
                                {Math.round(dimScore)}%
                              </span>
                            </div>
                            <div style={{
                              height: '8px',
                              background: 'var(--bg-surface)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${dimScore}%`,
                                height: '100%',
                                background: color,
                                transition: 'width 0.4s ease-out',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explainable Text Narrative */}
                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Explainable Match Narrative
                    </h4>
                    <div style={{
                      background: 'var(--bg-secondary)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      lineHeight: 1.6,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-line',
                    }}>
                      {matchData.explanation}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SKILLS MATRIX */}
              {activeSubTab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Matched Skills */}
                  <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <h4 style={{ fontSize: '0.9rem', color: '#34d399', margin: 0, fontWeight: 600 }}>
                        Matched Verified Skills ({matchData.matching_details?.skills_detail?.matched_skills?.length || 0})
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0' }}>
                      Skills found in both the job requirements and your verified profile:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {matchData.matching_details?.skills_detail?.matched_skills?.length > 0 ? (
                        matchData.matching_details.skills_detail.matched_skills.map((s, idx) => (
                          <span key={idx} style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#6ee7b7',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}>
                            <Check size={12} /> {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No direct required/preferred skills matched.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Missing Required Skills */}
                  <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <XCircle size={16} color="#ef4444" />
                      <h4 style={{ fontSize: '0.9rem', color: '#f87171', margin: 0, fontWeight: 600 }}>
                        Missing Required Skills ({matchData.matching_details?.skills_detail?.missing_required?.length || 0})
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0' }}>
                      Mandatory skills stated in the job description not currently in your profile:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {matchData.matching_details?.skills_detail?.missing_required?.length > 0 ? (
                        matchData.matching_details.skills_detail.missing_required.map((s, idx) => (
                          <span key={idx} style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 500,
                          }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#34d399' }}>
                          ✓ All identified mandatory required skills are present in your profile!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Missing Preferred Skills */}
                  <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <AlertTriangle size={16} color="#f59e0b" />
                      <h4 style={{ fontSize: '0.9rem', color: '#fbbf24', margin: 0, fontWeight: 600 }}>
                        Missing Preferred / Nice-to-Have Skills ({matchData.matching_details?.skills_detail?.missing_preferred?.length || 0})
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem 0' }}>
                      Bonus skills mentioned as plus/bonus in the JD:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {matchData.matching_details?.skills_detail?.missing_preferred?.length > 0 ? (
                        matchData.matching_details.skills_detail.missing_preferred.map((s, idx) => (
                          <span key={idx} style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#fde68a',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                          }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No missing preferred skills.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PARSED JD REQUIREMENTS */}
              {activeSubTab === 'requirements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Education & Experience Extracted */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                        Education Requirements Extracted
                      </div>
                      {matchData.jd_analysis?.education?.length > 0 ? (
                        matchData.jd_analysis.education.map((edu, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                            • {edu.degree || 'Degree'} in {edu.field || 'Relevant Field'} ({edu.classification || 'required'})
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No explicit degree requirements found.</span>
                      )}
                    </div>

                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                        Experience Expectations Extracted
                      </div>
                      {matchData.jd_analysis?.experience ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {matchData.jd_analysis.experience.years !== undefined && (
                            <div>Years required: <span style={{ fontWeight: 600 }}>{matchData.jd_analysis.experience.years} years</span></div>
                          )}
                          {matchData.jd_analysis.experience.is_entry_level && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem', marginTop: '0.3rem' }}>
                              Intern / Entry-level friendly
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No explicit minimum years requirement.</span>
                      )}
                    </div>
                  </div>

                  {/* Raw Requirements Classified Table */}
                  {matchData.jd_analysis?.requirements_raw?.length > 0 && (
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Extracted Requirement Statements ({matchData.jd_analysis.requirements_raw.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                        {matchData.jd_analysis.requirements_raw.map((req, i) => {
                          const isReq = req.classification === 'REQUIRED';
                          const isPref = req.classification === 'PREFERRED';
                          return (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.6rem',
                              padding: '0.5rem 0.75rem',
                              background: 'var(--bg-secondary)',
                              borderRadius: '4px',
                              fontSize: '0.82rem',
                            }}>
                              <span className={`badge ${isReq ? 'badge-info' : isPref ? 'badge-warning' : 'badge-gray'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                                {req.classification}
                              </span>
                              <span style={{ color: 'var(--text-primary)' }}>
                                {req.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {onOpenMaterials && matchData && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMaterials(matchData);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                📄 Tailor Resume & Cover Letter
              </button>
            )}
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
