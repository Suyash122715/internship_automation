import React from 'react';

export default function StatCard({ title, value, icon: Icon, badgeText, badgeColor = 'info', description }) {
  const badgeClass = `badge badge-${badgeColor}`;

  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle)'
        }}>
          {Icon && <Icon size={20} color="#818cf8" />}
        </div>
        {badgeText && (
          <span className={badgeClass} style={{ fontSize: '0.68rem' }}>
            {badgeText}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value !== undefined ? value : 0}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
