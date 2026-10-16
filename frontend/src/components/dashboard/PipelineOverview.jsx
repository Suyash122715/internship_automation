import React from 'react';
import { ArrowRight, Layers, FileCheck, Send, MessageSquare, Award } from 'lucide-react';

export default function PipelineOverview() {
  const applicationStages = [
    { name: 'DISCOVERED', desc: 'Job Scraped' },
    { name: 'ANALYZED', desc: 'JD Parsed' },
    { name: 'PREPARED', desc: 'Resume & Cover' },
    { name: 'READY', desc: 'User Approved' },
    { name: 'APPLIED', desc: 'Submitted' },
    { name: 'INTERVIEW', desc: 'In Progress' },
    { name: 'OFFER', desc: 'Offer Received' },
  ];

  const outreachStages = [
    { name: 'CONTACT FOUND', desc: 'Recruiter' },
    { name: 'EMAIL DRAFTED', desc: 'AI Draft' },
    { name: 'APPROVED', desc: 'User Confirmed' },
    { name: 'SENT', desc: 'Email Dispatched' },
    { name: 'REPLIED', desc: 'Response Inbound' },
  ];

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
          Application & Outreach Pipeline Architecture
        </h3>
        <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
          PRD Section 16 & 17 Lifecycle State Machines
        </p>
      </div>

      {/* Application Pipeline */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Application Flow Lifecycle
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          {applicationStages.map((stage, idx) => (
            <React.Fragment key={stage.name}>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                minWidth: '130px',
                flexShrink: 0
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                  {stage.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {stage.desc}
                </div>
              </div>
              {idx < applicationStages.length - 1 && (
                <ArrowRight size={16} color="#4b5563" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Outreach Pipeline */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Cold Outreach Flow Lifecycle
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem'
        }}>
          {outreachStages.map((stage, idx) => (
            <React.Fragment key={stage.name}>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                minWidth: '140px',
                flexShrink: 0
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7' }}>
                  {stage.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {stage.desc}
                </div>
              </div>
              {idx < outreachStages.length - 1 && (
                <ArrowRight size={16} color="#4b5563" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
