import React, { useState, useEffect } from 'react';
import {
  Send,
  Play,
  CheckCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { fetchJobs } from '../../services/api';
import ApplicationAssistantModal from './ApplicationAssistantModal';

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [manualModal, setManualModal] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchJobs({ limit: 100 });
      setJobs(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleLaunchAssistant = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleManualLaunch = () => {
    setSelectedJob(null);
    setManualModal(true);
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch =
      (j.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PREPARED') return matchesSearch && j.status === 'PREPARED';
    if (statusFilter === 'READY') return matchesSearch && j.status === 'READY';
    if (statusFilter === 'APPLIED') return matchesSearch && j.status === 'APPLIED';
    return matchesSearch;
  });

  const preparedCount = jobs.filter(j => j.status === 'PREPARED').length;
  const readyCount = jobs.filter(j => j.status === 'READY').length;
  const appliedCount = jobs.filter(j => j.status === 'APPLIED').length;

  return (
    <div>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-success">Batch 6 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Browser-Based Application Assistant
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
            Application Assistant & Dispatch Hub
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Automate form field detection, truthful data population, document attachment, and explicit human-in-the-loop review.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleManualLaunch}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={16} /> Open URL in Assistant
          </button>
          <button
            onClick={loadJobs}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Strict Truthfulness & Anti-Bot Rule Summary Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <ShieldCheck size={16} /> Strict Zero-Guesswork
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Maps verified profile fields without fabricating answers. Prompts user for unknown/custom questions.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <AlertTriangle size={16} /> No CAPTCHA Bypassing
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Adheres to Rule #7: Anti-bot and challenge prompts are surfaced directly for human resolution.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            <Send size={16} /> Explicit Review & Approval
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Never submits automatically. Final submission requires explicit human consent checkbox per PRD Section 12.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} color="#fbbf24" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{preparedCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Materials Prepared</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#818cf8" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{readyCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ready for Review</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={20} color="#34d399" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{appliedCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Applications Submitted</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-card" style={{
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search roles by title, company, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              width: '100%',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'PREPARED', 'READY', 'APPLIED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`btn btn-${statusFilter === status ? 'primary' : 'secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 1rem auto' }} />
          Loading pipeline applications...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No jobs found matching your criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredJobs.map(job => (
            <div
              key={job.id}
              className="glass-card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                borderLeft: job.status === 'APPLIED' ? '4px solid #10b981' : job.status === 'READY' ? '4px solid #6366f1' : '4px solid #f59e0b'
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {job.title}
                  </h4>
                  <span className={`badge badge-${job.status === 'APPLIED' ? 'success' : job.status === 'READY' ? 'purple' : 'warning'}`}>
                    {job.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  <strong>{job.company}</strong> • {job.location || 'Remote'}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {job.match_score ? (
                    <span style={{ color: '#818cf8', fontWeight: 600 }}>
                      Match Score: {job.match_score}%
                    </span>
                  ) : null}
                  {job.applied_at && (
                    <span style={{ color: '#34d399' }}>
                      Applied: {new Date(job.applied_at).toLocaleDateString()}
                    </span>
                  )}
                  {job.application_url && (
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Job Link <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleLaunchAssistant(job)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Play size={14} /> Launch Assistant
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assistant Modal */}
      {(showModal || manualModal) && (
        <ApplicationAssistantModal
          job={selectedJob}
          onClose={() => {
            setShowModal(false);
            setManualModal(false);
          }}
          onSuccess={() => {
            loadJobs();
          }}
        />
      )}
    </div>
  );
}
