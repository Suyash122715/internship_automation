import React, { useState } from 'react';
import {
  X,
  Building,
  MapPin,
  ExternalLink,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  Trash2,
  Globe,
  Code2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Briefcase,
  Sparkles,
  Layers,
  Check,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { matchJob } from '../../services/api';

export default function JobDetailModal({ job, onClose, onUpdateStatus, onDelete }) {
  const [showRawSource, setShowRawSource] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(job.status || 'DISCOVERED');
  const [updating, setUpdating] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [analyzingMatch, setAnalyzingMatch] = useState(false);
  const [matchError, setMatchError] = useState(null);

  const handleRunMatch = async () => {
    setAnalyzingMatch(true);
    setMatchError(null);
    try {
      const res = await matchJob(job.id);
      setMatchResult(res);
      setCurrentStatus('ANALYZED');
      if (onUpdateStatus) {
        onUpdateStatus(job.id, 'ANALYZED');
      }
    } catch (err) {
      console.error(err);
      setMatchError(err.message || 'Failed to match job against profile');
    } finally {
      setAnalyzingMatch(false);
    }
  };

  if (!job) return null;

  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus);
    setUpdating(true);
    try {
      await onUpdateStatus(job.id, newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const formattedDate = job.date_found
    ? new Date(job.date_found).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Unknown date';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content modal-content-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid var(--border-highlight)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontWeight: 700,
              fontSize: '1.2rem',
              flexShrink: 0
            }}>
              {job.company ? job.company.charAt(0).toUpperCase() : <Building size={22} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                {job.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: '#c7d2fe', fontWeight: 600 }}>
                  {job.company}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={13} color="#9ca3af" />
                  {job.location || 'Location unspecified'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                  {job.source || 'Manual'}
                </span>
              </div>
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
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Key Facts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            background: 'var(--bg-surface)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Workplace Mode
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.15rem' }}>
                {job.workplace_type || 'Not specified'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Employment Type
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.15rem' }}>
                {job.employment_type || 'Internship / Full-time'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Discovered On
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.15rem' }}>
                {formattedDate}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Compensation
              </div>
              <div style={{ fontSize: '0.85rem', color: job.salary_or_stipend ? '#34d399' : 'var(--text-secondary)', fontWeight: 500, marginTop: '0.15rem' }}>
                {job.salary_or_stipend || 'Not disclosed'}
              </div>
            </div>
          </div>

          {/* Status and Action bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Tracking Status:
              </span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="DISCOVERED">DISCOVERED</option>
                <option value="ANALYZED">ANALYZED</option>
                <option value="PREPARED">PREPARED</option>
                <option value="APPLIED">APPLIED</option>
                <option value="INTERVIEW">INTERVIEW</option>
                <option value="OFFER">OFFER</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRunMatch}
                disabled={analyzingMatch}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
              >
                <Sparkles size={14} className={analyzingMatch ? 'animate-spin' : ''} />
                {analyzingMatch ? 'Analyzing JD & Matching...' : matchResult ? 'Re-Analyze & Match' : 'Analyze & Match Profile'}
              </button>

              {job.application_url && (
                <a
                  href={job.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                >
                  <ExternalLink size={14} /> Open Official Application
                </a>
              )}
            </div>
          </div>

          {/* Match Analysis Results Banner */}
          {matchError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.82rem',
            }}>
              {matchError}
            </div>
          )}

          {matchResult && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Profile Compatibility: {Math.round(matchResult.overall_score)}%
                  </span>
                </div>
                <span className="badge" style={{
                  background: matchResult.overall_score >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: matchResult.overall_score >= 70 ? '#34d399' : '#fbbf24',
                  fontSize: '0.72rem',
                }}>
                  {matchResult.overall_score >= 70 ? 'High Fit' : matchResult.overall_score >= 45 ? 'Moderate Fit' : 'Low Fit'}
                </span>
              </div>

              {/* Skills breakdown preview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '4px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Skills Score</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>
                    {Math.round(matchResult.breakdown?.skills || 0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Education</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>
                    {Math.round(matchResult.breakdown?.education || 0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Experience</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>
                    {Math.round(matchResult.breakdown?.experience || 0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Location Fit</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>
                    {Math.round(matchResult.breakdown?.location || 0)}%
                  </div>
                </div>
              </div>

              {/* Matched & Missing Skills Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {matchResult.matching_details?.skills_detail?.matched_skills?.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#34d399' }}>Matched Skills:</strong>{' '}
                    {matchResult.matching_details.skills_detail.matched_skills.join(', ')}
                  </div>
                )}
                {matchResult.matching_details?.skills_detail?.missing_required?.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#f87171' }}>Missing Required:</strong>{' '}
                    {matchResult.matching_details.skills_detail.missing_required.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extracted Skills / Tags */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={15} color="#818cf8" /> Associated Skills & Tags
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {job.skills.map((s, idx) => (
                  <span key={idx} className="tag-chip" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Truthful Job Description */}
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Briefcase size={15} color="#818cf8" /> Source Job Description
            </h4>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              fontSize: '0.88rem',
              lineHeight: 1.65,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              maxHeight: '360px',
              overflowY: 'auto'
            }}>
              {job.description || (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No full description provided by source. Visit official application link for complete posting details.
                </span>
              )}
            </div>
          </div>

          {/* Auditability: Verbatim Raw Source Inspector */}
          {job.raw_source_data && (
            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden'
            }}>
              <button
                type="button"
                onClick={() => setShowRawSource(!showRawSource)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  background: 'var(--bg-surface)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="#10b981" /> Truthfulness Audit: Verbatim Raw Source Payload
                </span>
                {showRawSource ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showRawSource && (
                <pre style={{
                  margin: 0,
                  padding: '0.9rem',
                  background: '#070a13',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  maxHeight: '220px',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  borderTop: '1px solid var(--border-subtle)',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(job.raw_source_data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            onClick={() => onDelete(job.id)}
            className="btn btn-secondary"
            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', marginRight: 'auto', fontSize: '0.8rem' }}
          >
            <Trash2 size={14} /> Remove Job
          </button>
          
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
