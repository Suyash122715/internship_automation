import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Target, 
  FileText, 
  Send, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Trophy, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  UserCheck, 
  ChevronRight,
  ShieldAlert,
  Layers,
  PhoneCall
} from 'lucide-react';
import { 
  fetchDashboardSummary, 
  fetchTrackerApplications, 
  updateApplicationTrackerStatus, 
  fetchRecentActivity 
} from '../../services/api';

const ALLOWED_STATUSES = [
  "DISCOVERED", 
  "ANALYZED", 
  "PREPARED", 
  "READY", 
  "APPLIED", 
  "ASSESSMENT", 
  "INTERVIEW", 
  "OFFER", 
  "REJECTED", 
  "WITHDRAWN", 
  "EXPIRED"
];

const STATUS_COLORS = {
  DISCOVERED: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: '#4b5563' },
  ANALYZED: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#0284c7' },
  PREPARED: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: '#d97706' },
  READY: { bg: 'rgba(129, 140, 248, 0.15)', text: '#818cf8', border: '#4f46e5' },
  APPLIED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#059669' },
  ASSESSMENT: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '#9333ea' },
  INTERVIEW: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: '#d97706' },
  OFFER: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', border: '#16a34a' },
  REJECTED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#dc2626' },
  WITHDRAWN: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: '#4b5563' },
  EXPIRED: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', border: '#374151' },
};

export default function TrackerPage() {
  const [summary, setSummary] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Status edit modal state
  const [editingApp, setEditingApp] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editInterviewDate, setEditInterviewDate] = useState('');
  const [updating, setUpdating] = useState(false);

  // Active view tab: 'applications' | 'outreach' | 'activity'
  const [activeSubTab, setActiveSubTab] = useState('applications');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, appRes, actRes] = await Promise.all([
        fetchDashboardSummary(),
        fetchTrackerApplications({
          status: statusFilter || undefined,
          company: companyFilter || undefined,
          search: searchTerm || undefined,
        }),
        fetchRecentActivity(20),
      ]);
      setSummary(sumRes);
      setApplications(appRes.items || []);
      setActivity(actRes.events || []);
    } catch (err) {
      console.error('Failed to load tracker data:', err);
      setError(err.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, companyFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setCompanyFilter('');
    setSearchTerm('');
  };

  const openStatusEditor = (app) => {
    setEditingApp(app);
    setEditStatus(app.status);
    setEditNotes(app.submission_notes || '');
    setEditInterviewDate(
      app.interview_date ? app.interview_date.substring(0, 16) : ''
    );
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!editingApp) return;

    setUpdating(true);
    try {
      const payload = {
        status: editStatus,
        submission_notes: editNotes || null,
        interview_date: editInterviewDate ? new Date(editInterviewDate).toISOString() : null,
      };

      await updateApplicationTrackerStatus(editingApp.id, payload);
      setActionSuccess(`Application status successfully transitioned to ${editStatus}.`);
      setEditingApp(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update application status.');
    } finally {
      setUpdating(false);
    }
  };

  const appStats = summary?.application_stats || {};
  const outStats = summary?.outreach_stats || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-success">Batch 9 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              PRD Section 16, 17 & 18 • Application & Outreach Tracking Dashboard
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
            Application & Outreach Tracking Dashboard
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Live status management, verified funnel counts, filtering, and real chronological activity feeds directly from database records.
          </p>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Metrics
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {actionSuccess && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
        }}>
          <CheckCircle2 size={18} />
          <div style={{ flex: 1 }}>{actionSuccess}</div>
        </div>
      )}

      {/* PRD Section 16 & 18: Primary Funnel Overview Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
            Application Pipeline Funnel (PRD Section 16)
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Strict Database Counts (No Fabrication)
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
        }}>
          {[
            { label: 'Discovered', count: appStats.discovered_jobs || 0, color: '#9ca3af' },
            { label: 'Analyzed', count: appStats.analyzed_jobs || 0, color: '#38bdf8' },
            { label: 'Prepared', count: appStats.prepared_applications || 0, color: '#fbbf24' },
            { label: 'Ready', count: appStats.ready_applications || 0, color: '#818cf8' },
            { label: 'Applied', count: appStats.submitted_applications || 0, color: '#10b981' },
            { label: 'Assessment', count: appStats.assessments || 0, color: '#c084fc' },
            { label: 'Interview', count: appStats.interviews || 0, color: '#f59e0b' },
            { label: 'Offers', count: appStats.offers || 0, color: '#4ade80' },
            { label: 'Rejections', count: appStats.rejections || 0, color: '#f87171' },
          ].map((item) => (
            <div 
              key={item.label}
              onClick={() => setStatusFilter(item.label.toUpperCase() === 'OFFERS' ? 'OFFER' : item.label.toUpperCase())}
              style={{
                background: 'var(--bg-surface)',
                border: statusFilter === (item.label.toUpperCase() === 'OFFERS' ? 'OFFER' : item.label.toUpperCase())
                  ? `1px solid ${item.color}`
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color, marginTop: '0.2rem' }}>
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRD Section 17 & 18: Outreach Pipeline Funnel Overview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
            Cold Outreach Pipeline Funnel (PRD Section 17)
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Verified Contact & Email Logs
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
        }}>
          {[
            { label: 'Contacts Found', count: outStats.contacts_found || 0, color: '#a855f7' },
            { label: 'Emails Drafted', count: outStats.emails_drafted || 0, color: '#38bdf8' },
            { label: 'Approved', count: outStats.approved_emails || 0, color: '#818cf8' },
            { label: 'Sent', count: outStats.sent_emails || 0, color: '#10b981' },
            { label: 'Replies', count: outStats.replies || 0, color: '#34d399' },
            { label: 'Follow-ups', count: outStats.follow_ups || 0, color: '#f59e0b' },
            { label: 'No Response', count: outStats.no_response || 0, color: '#9ca3af' },
            { label: 'Bounced / Fail', count: outStats.bounced || 0, color: '#f87171' },
          ].map((item) => (
            <div 
              key={item.label}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 0.85rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color, marginTop: '0.2rem' }}>
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '1rem',
      }}>
        <button
          onClick={() => setActiveSubTab('applications')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'applications' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeSubTab === 'applications' ? '#818cf8' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'applications' ? 600 : 400,
            padding: '0.65rem 0.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Briefcase size={16} />
          Tracked Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveSubTab('activity')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'activity' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeSubTab === 'activity' ? '#818cf8' : 'var(--text-muted)',
            fontWeight: activeSubTab === 'activity' ? 600 : 400,
            padding: '0.65rem 0.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Clock size={16} />
          Recent Real Activity Stream ({activity.length})
        </button>
      </div>

      {/* Tab 1: Tracked Applications View */}
      {activeSubTab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters & Search Toolbar */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', position: 'relative' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem' }} />
                <input
                  type="text"
                  placeholder="Search role, company, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ minWidth: '160px' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="">All Statuses</option>
                  {ALLOWED_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: '160px' }}>
                <input
                  type="text"
                  placeholder="Filter company..."
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.55rem 1rem' }}>
                <Filter size={14} /> Filter
              </button>

              {(statusFilter || companyFilter || searchTerm) && (
                <button 
                  type="button" 
                  onClick={handleResetFilters} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '0.55rem 0.85rem' }}
                >
                  Clear Filters
                </button>
              )}
            </form>
          </div>

          {/* Table / List */}
          {applications.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <Briefcase size={24} color="#818cf8" />
              </div>
              <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                No Tracked Applications Matching Criteria
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto 1rem auto' }}>
                Applications are registered automatically when tailoring materials in Batch 5 or executing automation in Batch 6.
              </p>
              {(statusFilter || companyFilter || searchTerm) && (
                <button onClick={handleResetFilters} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                  Reset Active Filters
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Company & Role</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Location & Match</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Materials</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Interview / Notes</th>
                    <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const stStyle = STATUS_COLORS[app.status] || { bg: 'rgba(255,255,255,0.1)', text: '#fff', border: '#666' };
                    return (
                      <tr 
                        key={app.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {app.title}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                            {app.company}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {app.location || 'Remote / Unspecified'}
                          </div>
                          {app.match_score !== null && app.match_score !== undefined && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                                {Math.round(app.match_score)}% Match
                              </span>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background: stStyle.bg,
                            color: stStyle.text,
                            border: `1px solid ${stStyle.border}`,
                          }}>
                            {app.status}
                          </span>
                          {app.applied_at && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                              Applied: {new Date(app.applied_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                            {app.tailored_resume_path ? (
                              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CheckCircle2 size={12} /> Tailored Resume
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>— Resume not saved</span>
                            )}
                            {app.cover_letter_path ? (
                              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CheckCircle2 size={12} /> Cover Letter
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>— Letter not saved</span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem', maxWidth: '240px' }}>
                          {app.interview_date && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.78rem',
                              color: '#f59e0b',
                              fontWeight: 600,
                              marginBottom: '0.25rem',
                            }}>
                              <Calendar size={13} />
                              {new Date(app.interview_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                          {app.submission_notes ? (
                            <div style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {app.submission_notes}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No notes</span>
                          )}
                        </td>

                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => openStatusEditor(app)}
                            className="btn btn-secondary"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.4rem 0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <Edit3 size={13} /> Edit Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recent Real Activity Stream */}
      {activeSubTab === 'activity' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>
                Audit Log & Activity Stream (PRD Section 18)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Chronologically ordered actual database events (applications submitted, interviews set, cold emails dispatched, recruiters found).
              </p>
            </div>
            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
              Real SQL Records
            </span>
          </div>

          {activity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No recorded activity yet. Actions in previous modules will populate this audit log.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activity.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.1rem',
                  }}>
                    {evt.type === 'application_submitted' && <Send size={16} color={evt.color || '#10b981'} />}
                    {evt.type === 'interview_scheduled' && <Calendar size={16} color={evt.color || '#f59e0b'} />}
                    {evt.type === 'email_sent' && <Mail size={16} color={evt.color || '#818cf8'} />}
                    {evt.type === 'contact_added' && <UserCheck size={16} color={evt.color || '#a855f7'} />}
                    {evt.type === 'job_analyzed' && <Target size={16} color={evt.color || '#38bdf8'} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {evt.title}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                      {evt.description}
                    </p>
                  </div>

                  {evt.badge && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.08)',
                      color: evt.color || 'var(--text-primary)',
                      border: `1px solid ${evt.color || 'var(--border-subtle)'}`,
                      flexShrink: 0,
                    }}>
                      {evt.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {editingApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="glass-card" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-highlight)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
                  Update Application Status
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  {editingApp.title} @ {editingApp.company}
                </p>
              </div>
              <button 
                onClick={() => setEditingApp(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Application Stage (PRD Section 16 Lifecycle)
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  {ALLOWED_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {editStatus === 'INTERVIEW' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Scheduled Interview Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editInterviewDate}
                    onChange={(e) => setEditInterviewDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Submission / Status Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Applied via referral portal; technical screen on algorithms scheduled..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="btn btn-secondary"
                  disabled={updating}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                  style={{ fontSize: '0.85rem' }}
                >
                  {updating ? 'Saving Changes...' : 'Save & Sync Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
