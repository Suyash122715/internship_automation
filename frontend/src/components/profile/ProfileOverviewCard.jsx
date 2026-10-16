import React from 'react';
import { User, Mail, Phone, MapPin, GraduationCap, FileCheck, Award, Briefcase, CheckCircle2 } from 'lucide-react';

export default function ProfileOverviewCard({ profile, onSelectTab }) {
  const hasResume = profile?.resume_metadata?.has_file;
  const skillsCount = profile?.skills?.length || 0;
  const projectsCount = profile?.projects?.length || 0;
  const experienceCount = profile?.experience?.length || 0;

  // Calculate profile completeness
  const checkFields = [
    Boolean(profile?.name),
    Boolean(profile?.email),
    Boolean(profile?.college),
    skillsCount > 0,
    projectsCount > 0,
    hasResume,
  ];
  const completedCount = checkFields.filter(Boolean).length;
  const completenessPct = Math.round((completedCount / checkFields.length) * 100);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--accent-primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
          }}>
            {profile?.name ? profile.name.charAt(0).toUpperCase() : <User size={28} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--text-primary)' }}>
                {profile?.name || 'Authoritative Master Profile'}
              </h2>
              <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                Batch 2
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {profile?.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} color="#818cf8" /> {profile.email}
                </span>
              )}
              {profile?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="#818cf8" /> {profile.phone}
                </span>
              )}
              {profile?.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color="#818cf8" /> {profile.location}
                </span>
              )}
              {profile?.college && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <GraduationCap size={14} color="#818cf8" /> {profile.college} {profile.degree ? `(${profile.degree})` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completeness Meter */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          minWidth: '200px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Profile Readiness</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: completenessPct >= 80 ? '#34d399' : '#818cf8' }}>
              {completenessPct}%
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${completenessPct}%`,
              height: '100%',
              background: 'var(--accent-primary-gradient)',
              borderRadius: '3px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {completedCount} of {checkFields.length} essential sections completed
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={() => onSelectTab('resume')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <FileCheck size={14} color="#34d399" /> Master Resume
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: hasResume ? '#34d399' : 'var(--text-muted)' }}>
            {hasResume ? 'Uploaded & Parsed' : 'Not Uploaded'}
          </div>
        </button>

        <button
          onClick={() => onSelectTab('skills')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <Award size={14} color="#818cf8" /> Verified Skills
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
            {skillsCount} Skills Defined
          </div>
        </button>

        <button
          onClick={() => onSelectTab('projects')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <Briefcase size={14} color="#a855f7" /> Projects
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
            {projectsCount} Portfolio Projects
          </div>
        </button>

        <button
          onClick={() => onSelectTab('experience')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={14} color="#38bdf8" /> Work Experience
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
            {experienceCount} Experience Records
          </div>
        </button>
      </div>
    </div>
  );
}
