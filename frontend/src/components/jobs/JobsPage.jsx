import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Building,
  MapPin,
  ExternalLink,
  Briefcase,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { fetchJobs, updateJob, deleteJob } from '../../services/api';
import JobCard from './JobCard';
import JobDetailModal from './JobDetailModal';
import DiscoverModal from './DiscoverModal';
import AddJobModal from './AddJobModal';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWorkplace, setSelectedWorkplace] = useState('');
  const [internshipOnly, setInternshipOnly] = useState(false);
  const [sortBy, setSortBy] = useState('date_found');
  const [sortOrder, setSortOrder] = useState('desc');

  // Distributions
  const [sourcesDist, setSourcesDist] = useState({});
  const [statusDist, setStatusDist] = useState({});

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 18;

  // Modals
  const [selectedJob, setSelectedJob] = useState(null);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * limit;
      const res = await fetchJobs({
        q: searchTerm || undefined,
        source: selectedSource || undefined,
        status: selectedStatus || undefined,
        workplace_type: selectedWorkplace || undefined,
        is_internship_only: internshipOnly ? true : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        skip,
        limit
      });

      setJobs(res.items || []);
      setTotal(res.total || 0);
      setSourcesDist(res.sources_distribution || {});
      setStatusDist(res.status_distribution || {});
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [page, searchTerm, selectedSource, selectedStatus, selectedWorkplace, internshipOnly, sortBy, sortOrder]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      const updated = await updateJob(jobId, { status: newStatus });
      setJobs(jobs.map((j) => (j.id === jobId ? updated : j)));
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(updated);
      }
      showToast(`Job status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to remove this job opportunity?')) {
      return;
    }
    try {
      await deleteJob(jobId);
      setJobs(jobs.filter((j) => j.id !== jobId));
      setTotal((prev) => Math.max(0, prev - 1));
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
      }
      showToast('Job removed from database');
    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message}`);
    }
  };

  const handleDiscoveryFinished = (discoveryRes) => {
    loadJobs();
    showToast(`Discovery finished: ${discoveryRes.new_imported} new opportunities imported!`);
  };

  const handleJobCreated = (newJob) => {
    loadJobs();
    showToast(`Added '${newJob.title}' at '${newJob.company}'`);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#1f2937',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.85rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-success">Batch 3 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Authentic Multi-Source Internship Discovery & ATS Integration
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
            Internship & Job Discovery
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Explore genuine opportunities with live public API scrapers, Greenhouse/Lever ATS board importers, and deduplication.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            <PlusCircle size={16} /> Add Job Manually
          </button>
          
          <button
            onClick={() => setShowDiscoverModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem' }}
          >
            <Sparkles size={16} /> Discover Opportunities
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Search Line */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1,
              minWidth: '260px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search
                size={16}
                color="#9ca3af"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search by role title, company name, skill, or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                style={{ paddingLeft: '2.4rem' }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort Field Selector */}
            <div style={{ minWidth: '160px' }}>
              <select
                className="form-select"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(':');
                  setSortBy(sb);
                  setSortOrder(so);
                  setPage(1);
                }}
                style={{ height: '100%' }}
              >
                <option value="date_found:desc">Newest Discovered</option>
                <option value="date_found:asc">Oldest Discovered</option>
                <option value="company:asc">Company (A-Z)</option>
                <option value="title:asc">Role Title (A-Z)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadJobs}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 0.85rem' }}
              title="Refresh Listings"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Faceted Filter Chips Line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            {/* Source Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Source:
              </span>
              <button
                type="button"
                onClick={() => { setSelectedSource(''); setPage(1); }}
                className={`filter-pill ${selectedSource === '' ? 'active' : ''}`}
              >
                All Sources ({total})
              </button>
              {Object.entries(sourcesDist).map(([src, cnt]) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => { setSelectedSource(src); setPage(1); }}
                  className={`filter-pill ${selectedSource === src ? 'active' : ''}`}
                >
                  {src} ({cnt})
                </button>
              ))}
            </div>

            {/* Workplace & Internship Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={selectedWorkplace}
                onChange={(e) => { setSelectedWorkplace(e.target.value); setPage(1); }}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', width: 'auto' }}
              >
                <option value="">All Workplaces</option>
                <option value="Remote">Remote Only</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>

              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', width: 'auto' }}
              >
                <option value="">All Statuses</option>
                <option value="DISCOVERED">DISCOVERED</option>
                <option value="ANALYZED">ANALYZED</option>
                <option value="PREPARED">PREPARED</option>
                <option value="APPLIED">APPLIED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={internshipOnly}
                  onChange={(e) => { setInternshipOnly(e.target.checked); setPage(1); }}
                  style={{ accentColor: '#6366f1' }}
                />
                Internships Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{jobs.length}</span> of{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{total}</span> opportunities
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Jobs Grid / List */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem'
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.5rem', minHeight: '180px', opacity: 0.6 }}>
              <div style={{ width: '40%', height: '14px', background: 'var(--bg-surface)', borderRadius: '4px', marginBottom: '0.75rem' }} />
              <div style={{ width: '75%', height: '18px', background: 'var(--bg-surface)', borderRadius: '4px', marginBottom: '1.25rem' }} />
              <div style={{ width: '50%', height: '12px', background: 'var(--bg-surface)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#f87171', marginBottom: '0.5rem' }}>
            Failed to Load Job Opportunities
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1rem auto' }}>
            {error}
          </p>
          <button onClick={loadJobs} className="btn btn-primary">
            Retry Loading
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Briefcase size={28} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No Job Opportunities Found
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            {searchTerm || selectedSource || selectedWorkplace || selectedStatus
              ? 'No jobs match your active filters. Try clearing or adjusting search parameters.'
              : 'Your internship database is currently empty. Run a live discovery search across public boards or import postings from Greenhouse / Lever.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            {searchTerm || selectedSource || selectedWorkplace || selectedStatus ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSource('');
                  setSelectedStatus('');
                  setSelectedWorkplace('');
                  setInternshipOnly(false);
                }}
                className="btn btn-secondary"
              >
                Clear All Filters
              </button>
            ) : (
              <>
                <button onClick={() => setShowDiscoverModal(true)} className="btn btn-primary">
                  <Sparkles size={16} /> Run Live Discovery
                </button>
                <button onClick={() => setShowAddModal(true)} className="btn btn-secondary">
                  <PlusCircle size={16} /> Add Job Manually
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1rem'
        }}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSelect={setSelectedJob}
              onDelete={handleDeleteJob}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Job Detail Drawer / Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteJob}
        />
      )}

      {/* Live Discovery Modal */}
      {showDiscoverModal && (
        <DiscoverModal
          onClose={() => setShowDiscoverModal(false)}
          onDiscoveryComplete={handleDiscoveryFinished}
        />
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onJobCreated={handleJobCreated}
        />
      )}
    </div>
  );
}
