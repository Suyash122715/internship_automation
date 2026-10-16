import React from 'react';
import { RefreshCw, Server, Database, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Header({ health, onRefresh, loading }) {
  const isHealthy = health?.status === 'healthy';
  const dbConnected = health?.database?.status === 'connected';

  return (
    <header style={{
      height: '70px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
          Project Foundation & Dashboard
        </h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
          Batch 1 • FastAPI + React + SQLite Architecture
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Backend Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem'
        }}>
          <Server size={14} color="#818cf8" />
          <span style={{ color: 'var(--text-secondary)' }}>FastAPI:</span>
          <span className={`pulse-status ${isHealthy ? 'healthy' : 'error'}`}></span>
          <span style={{ fontWeight: 600, color: isHealthy ? '#34d399' : '#ef4444' }}>
            {isHealthy ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Database Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.85rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem'
        }}>
          <Database size={14} color="#38bdf8" />
          <span style={{ color: 'var(--text-secondary)' }}>SQLite:</span>
          <span className={`pulse-status ${dbConnected ? 'healthy' : 'error'}`}></span>
          <span style={{ fontWeight: 600, color: dbConnected ? '#34d399' : '#ef4444' }}>
            {dbConnected ? 'Initialized' : 'Error'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="btn btn-secondary"
          disabled={loading}
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
          title="Refresh Health & Metrics"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
