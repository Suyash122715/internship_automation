import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Sliders, 
  Search, 
  FileText, 
  Send, 
  Mail, 
  Activity, 
  Settings as SettingsIcon,
  ShieldCheck,
  Layers
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, batch: 'Batch 1', available: true },
    { id: 'profile', label: 'User Profile & Resume', icon: User, batch: 'Batch 2', available: true },
    { id: 'preferences', label: 'Preferences', icon: Sliders, batch: 'Batch 2', available: false },
    { id: 'jobs', label: 'Job Discovery', icon: Search, batch: 'Batch 3', available: true },
    { id: 'matching', label: 'JD & AI Matching', icon: Layers, batch: 'Batch 4', available: true },
    { id: 'materials', label: 'Resume & Cover Letter', icon: FileText, batch: 'Batch 5', available: true },
    { id: 'applications', label: 'Applications Auto', icon: Send, batch: 'Batch 6', available: true },
    { id: 'contacts', label: 'Recruiter Discovery', icon: ShieldCheck, batch: 'Batch 7', available: true },
    { id: 'outreach', label: 'Cold Email Engine', icon: Mail, batch: 'Batch 8', available: true },
    { id: 'tracker', label: 'Application Tracker', icon: Activity, batch: 'Batch 9', available: true },
  ];

  return (
    <aside style={{
      width: '280px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.5rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'var(--accent-primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
        }}>
          <Layers size={20} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
            Internship Agent
          </h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Batch 10 • Final Integration & Hardening
          </span>
        </div>
      </div>

      {/* Navigation list */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div style={{ 
          fontSize: '0.7rem', 
          fontWeight: 700, 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em',
          padding: '0.5rem 0.75rem'
        }}>
          Navigation Shell
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid var(--border-highlight)' : '1px solid transparent',
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  color: isActive ? '#818cf8' : item.available ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-normal)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} color={isActive ? '#818cf8' : item.available ? '#9ca3af' : '#4b5563'} />
                  <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </span>
                </div>
                {item.available ? (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                    Active
                  </span>
                ) : (
                  <span className="badge badge-gray" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                    {item.batch}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer info */}
      <div style={{
        padding: '1rem 1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>PRD v1.0 Compliant</span>
        <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>Local-First</span>
      </div>
    </aside>
  );
}
