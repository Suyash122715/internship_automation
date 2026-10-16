import React from 'react';
import {
  Building,
  MapPin,
  ExternalLink,
  Calendar,
  DollarSign,
  Tag,
  Eye,
  Trash2,
  Globe,
  Briefcase
} from 'lucide-react';

export default function JobCard({ job, onSelect, onDelete, onUpdateStatus }) {
  const formattedDate = job.date_found
    ? new Date(job.date_found).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    : '';

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPLIED':
        return 'badge-success';
      case 'INTERVIEW':
      case 'OFFER':
        return 'badge-purple';
      case 'ANALYZED':
      case 'PREPARED':
        return 'badge-warning';
      case 'ARCHIVED':
        return 'badge-gray';
      default:
        return 'badge-info';
    }
  };

  const getWorkplaceBadgeClass = (wp) => {
    const lower = (wp || '').toLowerCase();
    if (lower === 'remote') return 'badge-success';
    if (lower === 'hybrid') return 'badge-purple';
    return 'badge-gray';
  };

  return (
    <div className="job-card">
      {/* Top row: Company, Source badge, Status */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontWeight: 700,
              fontSize: '1rem',
              flexShrink: 0
            }}>
              {job.company ? job.company.charAt(0).toUpperCase() : <Building size={18} />}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {job.company}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={11} /> {job.location || 'Location Unspecified'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`badge ${getStatusBadgeClass(job.status)}`} style={{ fontSize: '0.65rem' }}>
              {job.status}
            </span>
          </div>
        </div>

        {/* Job Title */}
        <h3 
          onClick={() => onSelect(job)}
          style={{
            fontSize: '1rem',
            color: 'var(--text-primary)',
            margin: '0.2rem 0 0.6rem 0',
            fontWeight: 600,
            cursor: 'pointer',
            lineHeight: 1.35
          }}
          onMouseEnter={(e) => e.target.style.color = '#818cf8'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}
        >
          {job.title}
        </h3>

        {/* Tags & Meta Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {job.workplace_type && (
            <span className={`badge ${getWorkplaceBadgeClass(job.workplace_type)}`} style={{ fontSize: '0.65rem' }}>
              {job.workplace_type}
            </span>
          )}

          {job.employment_type && (
            <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>
              {job.employment_type}
            </span>
          )}

          {job.salary_or_stipend && (
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
              <DollarSign size={10} /> {job.salary_or_stipend}
            </span>
          )}

          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
            {job.source || 'Manual'}
          </span>
        </div>

        {/* Skills Preview */}
        {job.skills && job.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.85rem' }}>
            {job.skills.slice(0, 4).map((s, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(31, 41, 55, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)'
                }}
              >
                {s}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '0.75rem',
        marginTop: 'auto'
      }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Found {formattedDate}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {job.application_url && (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                padding: '0.35rem 0.6rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              title="Open Official Job Link"
            >
              <ExternalLink size={12} /> Apply
            </a>
          )}

          <button
            type="button"
            onClick={() => onSelect(job)}
            className="btn btn-primary"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Eye size={12} /> View
          </button>
        </div>
      </div>
    </div>
  );
}
