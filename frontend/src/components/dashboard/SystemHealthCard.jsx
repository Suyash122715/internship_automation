import React from 'react';
import { Database, Server, CheckCircle2, ShieldCheck, Terminal, Cpu } from 'lucide-react';

export default function SystemHealthCard({ health }) {
  const isHealthy = health?.status === 'healthy';
  const dbStatus = health?.database?.status;
  const tables = health?.database?.tables || [];

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <ShieldCheck size={20} color="#34d399" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
              Batch 1 Foundation Infrastructure
            </h3>
            <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
              Core system status, SQLite storage & API endpoints
            </p>
          </div>
        </div>
        <span className={`badge ${isHealthy ? 'badge-success' : 'badge-warning'}`}>
          {isHealthy ? 'System Operational' : 'Degraded'}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Backend API */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <Server size={16} color="#818cf8" />
            <span style={{ fontWeight: 600 }}>Backend Server</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            FastAPI 0.115 (Uvicorn)
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Environment: {health?.app_env || 'development'}
          </div>
        </div>

        {/* Database */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <Database size={16} color="#38bdf8" />
            <span style={{ fontWeight: 600 }}>Database Storage</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            SQLite ({dbStatus === 'connected' ? 'Connected' : 'Error'})
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
            Path: {health?.database?.database_url || 'internship_agent.db'}
          </div>
        </div>

        {/* API Health Endpoint */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <Terminal size={16} color="#a855f7" />
            <span style={{ fontWeight: 600 }}>Health Endpoint</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            GET /api/v1/health
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Response: 200 OK
          </div>
        </div>
      </div>

      {/* Initialized Tables List */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Initialized SQLite Tables ({tables.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {tables.length > 0 ? (
            tables.map((table) => (
              <span
                key={table}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: '#a5b4fc',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}
              >
                <CheckCircle2 size={12} color="#34d399" />
                {table}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tables detected yet</span>
          )}
        </div>
      </div>
    </div>
  );
}
