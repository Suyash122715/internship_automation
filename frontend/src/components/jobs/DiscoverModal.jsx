import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Globe,
  Radio,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  discoverJobs,
  fetchSourceStatus,
  importGreenhouseJobs,
  importLeverJobs
} from '../../services/api';

export default function DiscoverModal({ onClose, onDiscoveryComplete }) {
  const [activeMode, setActiveMode] = useState('multi'); // 'multi', 'greenhouse', 'lever'
  
  // Multi-source form state
  const [query, setQuery] = useState('intern');
  const [selectedSources, setSelectedSources] = useState(['remoteok', 'jobicy', 'arbeitnow']);
  const [filterInternOnly, setFilterInternOnly] = useState(true);
  
  // Greenhouse form state
  const [ghToken, setGhToken] = useState('');
  const [ghFilter, setGhFilter] = useState('');
  
  // Lever form state
  const [leverCompany, setLeverCompany] = useState('');
  const [leverFilter, setLeverFilter] = useState('');
  
  // Source health status
  const [sourcesStatus, setSourcesStatus] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Execution state
  const [discovering, setDiscovering] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadSourceStatus();
  }, []);

  const loadSourceStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await fetchSourceStatus();
      setSourcesStatus(data);
    } catch (err) {
      console.error('Failed to load source status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const toggleSource = (sourceName) => {
    if (selectedSources.includes(sourceName)) {
      if (selectedSources.length > 1) {
        setSelectedSources(selectedSources.filter(s => s !== sourceName));
      }
    } else {
      setSelectedSources([...selectedSources, sourceName]);
    }
  };

  const handleRunDiscovery = async (e) => {
    e.preventDefault();
    setDiscovering(true);
    setErrorMsg(null);
    setResultSummary(null);

    try {
      let res;
      if (activeMode === 'multi') {
        res = await discoverJobs({
          query,
          sources: selectedSources,
          filter_internships_only: filterInternOnly,
          limit_per_source: 30
        });
      } else if (activeMode === 'greenhouse') {
        if (!ghToken.trim()) {
          throw new Error('Please enter a Greenhouse company board token (e.g., stripe, figma, github)');
        }
        res = await importGreenhouseJobs(ghToken.trim(), ghFilter.trim());
      } else if (activeMode === 'lever') {
        if (!leverCompany.trim()) {
          throw new Error('Please enter a Lever company identifier (e.g., palantir, netflix, scale)');
        }
        res = await importLeverJobs(leverCompany.trim(), leverFilter.trim());
      }

      setResultSummary(res);
      if (onDiscoveryComplete) {
        onDiscoveryComplete(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Discovery operation encountered an issue.');
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content modal-content-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              <Search size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Live Job & Internship Discovery
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Real-world authentic listings with automatic deduplication
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Mode Selector Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => { setActiveMode('multi'); setResultSummary(null); }}
              style={{
                padding: '0.6rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeMode === 'multi' ? 'var(--accent-primary-gradient)' : 'transparent',
                color: activeMode === 'multi' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-normal)'
              }}
            >
              Public Boards (Multi)
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('greenhouse'); setResultSummary(null); }}
              style={{
                padding: '0.6rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeMode === 'greenhouse' ? 'var(--accent-primary-gradient)' : 'transparent',
                color: activeMode === 'greenhouse' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-normal)'
              }}
            >
              Greenhouse ATS Board
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('lever'); setResultSummary(null); }}
              style={{
                padding: '0.6rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeMode === 'lever' ? 'var(--accent-primary-gradient)' : 'transparent',
                color: activeMode === 'lever' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-normal)'
              }}
            >
              Lever ATS Board
            </button>
          </div>

          <form onSubmit={handleRunDiscovery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Mode 1: Multi-source */}
            {activeMode === 'multi' && (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Search Query / Role Keyword</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. intern, software engineer intern, python, frontend..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Searches live API listings matching role, technology tags, or company.
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select Active Sources</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
                    {[
                      { id: 'remoteok', name: 'RemoteOK API', desc: 'Tech & developer listings' },
                      { id: 'jobicy', name: 'Jobicy Remote', desc: 'Global remote internships' },
                      { id: 'arbeitnow', name: 'Arbeitnow API', desc: 'European & global tech' }
                    ].map((src) => {
                      const isSelected = selectedSources.includes(src.id);
                      return (
                        <div
                          key={src.id}
                          onClick={() => toggleSource(src.id)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--border-highlight)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.6rem',
                            transition: 'var(--transition-normal)'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ marginTop: '0.2rem', accentColor: '#6366f1' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {src.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {src.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    id="filterIntern"
                    checked={filterInternOnly}
                    onChange={(e) => setFilterInternOnly(e.target.checked)}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <label htmlFor="filterIntern" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Strictly filter for Internship / Co-op / Junior roles only
                  </label>
                </div>
              </>
            )}

            {/* Mode 2: Greenhouse ATS Board */}
            {activeMode === 'greenhouse' && (
              <>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-highlight)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  Fetch authentic, open postings directly from any company using Greenhouse Job Boards (e.g. <code style={{ color: '#818cf8' }}>stripe</code>, <code style={{ color: '#818cf8' }}>figma</code>, <code style={{ color: '#818cf8' }}>github</code>, <code style={{ color: '#818cf8' }}>reddit</code>, <code style={{ color: '#818cf8' }}>airbnb</code>, <code style={{ color: '#818cf8' }}>cloudflare</code>).
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Company Board Token / Subdomain *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. stripe, figma, github, reddit, airbnb"
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      required
                    />
                  </div>
                  {/* Quick popular token chips */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick test:</span>
                    {['figma', 'stripe', 'github', 'reddit', 'cloudflare'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setGhToken(t)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-full)',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.72rem',
                          color: '#818cf8',
                          cursor: 'pointer'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Optional Role Filter Keyword</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. intern, software engineer, security..."
                    value={ghFilter}
                    onChange={(e) => setGhFilter(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Mode 3: Lever ATS Board */}
            {activeMode === 'lever' && (
              <>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-highlight)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  Fetch authentic, open postings directly from any company using Lever Postings (e.g. <code style={{ color: '#818cf8' }}>palantir</code>, <code style={{ color: '#818cf8' }}>netflix</code>, <code style={{ color: '#818cf8' }}>scale</code>).
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Company Lever Identifier *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. palantir, netflix, scale"
                    value={leverCompany}
                    onChange={(e) => setLeverCompany(e.target.value)}
                    required
                  />
                  {/* Quick popular token chips */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick test:</span>
                    {['palantir', 'netflix', 'scale'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setLeverCompany(t)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-full)',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.72rem',
                          color: '#818cf8',
                          cursor: 'pointer'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Optional Role Filter Keyword</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. intern, software engineer..."
                    value={leverFilter}
                    onChange={(e) => setLeverFilter(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#f87171',
                fontSize: '0.82rem'
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Discovery Success Summary */}
            {resultSummary && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 600, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={18} />
                  <span>{resultSummary.message}</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fetched</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{resultSummary.total_found}</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#34d399' }}>New Imported</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{resultSummary.new_imported}</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duplicates Skipped</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#9ca3af' }}>{resultSummary.duplicates_skipped}</div>
                  </div>
                </div>

                {/* Breakdown per source */}
                {resultSummary.sources_results && resultSummary.sources_results.length > 0 && (
                  <div style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.4rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Source Results:</div>
                    {resultSummary.sources_results.map((sr, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{sr.source}:</span>
                        <span>
                          {sr.status === 'success' 
                            ? `${sr.found} found (${sr.new_imported} new)` 
                            : `Failed: ${sr.error_details || 'Unreachable'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={discovering}
              >
                {resultSummary ? 'Done' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={discovering}
              >
                {discovering ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Fetching Live Postings...
                  </>
                ) : (
                  <>
                    <Search size={16} /> Run Discovery
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
