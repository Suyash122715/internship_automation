import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  ShieldCheck,
  Download,
  Eye,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  ExternalLink,
  Plus
} from 'lucide-react';
import { fetchJobs, generateAllMaterials } from '../../services/api';
import MaterialViewerModal from './MaterialViewerModal';

export default function MaterialsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

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

  const handleQuickPrepare = async (job) => {
    try {
      setActionMessage(`Generating materials for ${job.title}...`);
      await generateAllMaterials(job.id);
      setActionMessage(`✓ Materials generated for ${job.title} at ${job.company}`);
      await loadJobs();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = 
      (j.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PREPARED') return matchesSearch && j.status === 'PREPARED';
    if (statusFilter === 'ANALYZED') return matchesSearch && j.status === 'ANALYZED';
    if (statusFilter === 'DISCOVERED') return matchesSearch && j.status === 'DISCOVERED';
    return matchesSearch;
  });

  const preparedCount = jobs.filter(j => j.status === 'PREPARED').length;
  const analyzedCount = jobs.filter(j => j.status === 'ANALYZED').length;

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
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-success">Batch 5 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tailored Resumes & Cover Letter Engine
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
            Application Materials Studio
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Generate ATS-tailored resumes and personalized cover letters strictly grounded in your verified profile.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Prepared</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{preparedCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Analyzed</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#818cf8' }}>{analyzedCount}</div>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '8px',
          color: '#c7d2fe',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', color: '#c7d2fe', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by title, company, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Jobs ({jobs.length})</option>
            <option value="PREPARED">Prepared Materials ({preparedCount})</option>
            <option value="ANALYZED">Analyzed ({analyzedCount})</option>
            <option value="DISCOVERED">Discovered</option>
          </select>
        </div>

        <button
          onClick={loadJobs}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} /> Refresh List
        </button>
      </div>

      {/* Jobs Grid / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem auto', display: 'block', color: 'var(--accent-color)' }} />
          <p>Loading opportunities...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Opportunities Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
            No jobs match your current filter. Discover jobs in the Job Discovery tab first.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
          {filteredJobs.map((j) => {
            const isPrepared = j.status === 'PREPARED';
            return (
              <div
                key={j.id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: isPrepared ? '3px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginRight: '0.4rem' }}>
                        {j.company}
                      </span>
                      {j.workplace_type && (
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                          {j.workplace_type}
                        </span>
                      )}
                    </div>
                    <span className={`badge ${isPrepared ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                      {j.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                    {j.title}
                  </h3>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {j.location || 'Location unspecified'} {j.salary_or_stipend && `• ${j.salary_or_stipend}`}
                  </div>

                  {j.match_score !== null && j.match_score !== undefined && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.6rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Match Score:</span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: j.match_score >= 70 ? '#10b981' : j.match_score >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {j.match_score}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => setSelectedJob(j)}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  >
                    <Eye size={14} /> {isPrepared ? 'View & Edit Studio' : 'Prepare Materials'}
                  </button>

                  {!isPrepared && (
                    <button
                      onClick={() => handleQuickPrepare(j)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      title="1-Click Auto Generate"
                    >
                      <Sparkles size={14} color="#818cf8" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Material Studio Modal */}
      {selectedJob && (
        <MaterialViewerModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onMaterialsUpdated={loadJobs}
        />
      )}
    </div>
  );
}
