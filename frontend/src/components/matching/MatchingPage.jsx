import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  RefreshCw,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  FileText,
  Building,
  MapPin,
  ExternalLink,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Check,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import {
  fetchJobs,
  getProfile,
  matchJob,
  batchMatchJobs,
  analyzeJDText
} from '../../services/api';
import MatchDetailModal from './MatchDetailModal';
import JDAnalyzerTool from './JDAnalyzerTool';
import MaterialViewerModal from '../materials/MaterialViewerModal';

export default function MatchingPage() {
  const [activeTab, setActiveTab] = useState('job_matches'); // 'job_matches' | 'analyzer'
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Selected job for detailed match breakdown modal
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [materialsJob, setMaterialsJob] = useState(null);

  // Weight customization
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  const [weights, setWeights] = useState({
    skills: 0.50,
    education: 0.15,
    experience: 0.15,
    location: 0.10,
    role_relevance: 0.10,
  });

  // Filter
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, profileRes] = await Promise.all([
        fetchJobs({ limit: 100 }),
        getProfile().catch(() => null),
      ]);
      setJobs(jobsRes.items || []);
      setProfile(profileRes);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load matching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunBatchMatch = async () => {
    if (!profile || !profile.name) {
      showToast('Please complete your profile first (Name and Skills are required).');
      return;
    }
    if (jobs.length === 0) {
      showToast('No jobs to match. Discover or import jobs first.');
      return;
    }

    setMatchingInProgress(true);
    setBatchProgress('Analyzing job requirements and computing grounded compatibility scores...');

    try {
      const jobIds = jobs.map((j) => j.id);
      const res = await batchMatchJobs(jobIds, weights);
      showToast(`Batch matching completed! Matched ${res.total_matched} opportunities.`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(`Batch matching failed: ${err.message}`);
    } finally {
      setMatchingInProgress(false);
      setBatchProgress(null);
    }
  };

  const handleViewMatch = async (jobId) => {
    setSelectedJobId(jobId);
    setLoadingDetails(true);
    try {
      const details = await matchJob(jobId, weights);
      setMatchDetails(details);
    } catch (err) {
      console.error(err);
      showToast(`Error computing match: ${err.message}`);
      setSelectedJobId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 45) return '#f59e0b'; // Amber
    if (score > 0) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchTerm ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());

    const score = job.match_score !== null ? job.match_score : -1;
    const matchesMinScore = minScoreFilter === 0 ? true : score >= minScoreFilter;

    return matchesSearch && matchesMinScore;
  });

  // Sort by match score desc (nulls last)
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const scoreA = a.match_score !== null ? a.match_score : -1;
    const scoreB = b.match_score !== null ? b.match_score : -1;
    return scoreB - scoreA;
  });

  const analyzedCount = jobs.filter((j) => j.match_score !== null).length;
  const highMatchCount = jobs.filter((j) => j.match_score !== null && j.match_score >= 70).length;

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
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.12) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-success">Batch 4 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Deterministic JD Requirement Extraction & Profile Matching
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
            Job Description Analysis & Profile Matching
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Extract required vs preferred skills, calculate explainable compatibility scores, and verify qualification evidence without hallucinations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowWeightSettings(!showWeightSettings)}
            className={`btn ${showWeightSettings ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem' }}
          >
            <Sliders size={16} /> Configure Weights
          </button>

          <button
            onClick={handleRunBatchMatch}
            disabled={matchingInProgress || loading}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem' }}
          >
            <Sparkles size={16} className={matchingInProgress ? 'animate-spin' : ''} />
            {matchingInProgress ? 'Matching Pipeline...' : `Match All Jobs (${jobs.length})`}
          </button>
        </div>
      </div>

      {/* Top Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('job_matches')}
          style={{
            background: activeTab === 'job_matches' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'job_matches' ? '1px solid var(--border-highlight)' : '1px solid transparent',
            color: activeTab === 'job_matches' ? '#818cf8' : 'var(--text-secondary)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <TrendingUp size={16} /> Job Match Pipeline ({analyzedCount}/{jobs.length} Scored)
        </button>

        <button
          onClick={() => setActiveTab('analyzer')}
          style={{
            background: activeTab === 'analyzer' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: activeTab === 'analyzer' ? '1px solid var(--border-highlight)' : '1px solid transparent',
            color: activeTab === 'analyzer' ? '#818cf8' : 'var(--text-secondary)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <BookOpen size={16} /> Interactive JD Text Analyzer
        </button>
      </div>

      {/* Weight Customization Panel */}
      {showWeightSettings && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)' }}>
                Scoring Weight Distribution (PRD Section 9)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Customize relative importance for the 5-dimension matching engine. Weights are automatically normalized to 100%.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setWeights({ skills: 0.50, education: 0.15, experience: 0.15, location: 0.10, role_relevance: 0.10 })}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                Default Balanced
              </button>
              <button
                onClick={() => setWeights({ skills: 0.70, education: 0.10, experience: 0.05, location: 0.05, role_relevance: 0.10 })}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                Skills Heavy (70%)
              </button>
              <button
                onClick={() => setWeights({ skills: 0.40, education: 0.25, experience: 0.10, location: 0.15, role_relevance: 0.10 })}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                Student / Intern Focused
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            background: 'var(--bg-surface)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Skills</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Math.round(weights.skills * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.skills}
                onChange={(e) => setWeights({ ...weights, skills: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Education</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Math.round(weights.education * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={weights.education}
                onChange={(e) => setWeights({ ...weights, education: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Experience</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Math.round(weights.experience * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={weights.experience}
                onChange={(e) => setWeights({ ...weights, experience: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Location</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Math.round(weights.location * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={weights.location}
                onChange={(e) => setWeights({ ...weights, location: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Role Relevance</span>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Math.round(weights.role_relevance * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={weights.role_relevance}
                onChange={(e) => setWeights({ ...weights, role_relevance: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Tab View */}
      {activeTab === 'job_matches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Metrics summary cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
          }}>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Opportunities</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {jobs.length}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scored / Analyzed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#818cf8', marginTop: '0.2rem' }}>
                {analyzedCount}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High Match (Score ≥ 70%)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>
                {highMatchCount}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Profile Skills</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {profile?.skills?.length || 0}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: '10px' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search matching results by role or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Score Filter:</span>
              <button
                onClick={() => setMinScoreFilter(0)}
                className={`filter-pill ${minScoreFilter === 0 ? 'active' : ''}`}
                style={{ fontSize: '0.75rem' }}
              >
                All
              </button>
              <button
                onClick={() => setMinScoreFilter(70)}
                className={`filter-pill ${minScoreFilter === 70 ? 'active' : ''}`}
                style={{ fontSize: '0.75rem' }}
              >
                ≥ 70% (High Match)
              </button>
              <button
                onClick={() => setMinScoreFilter(50)}
                className={`filter-pill ${minScoreFilter === 50 ? 'active' : ''}`}
                style={{ fontSize: '0.75rem' }}
              >
                ≥ 50%
              </button>
            </div>

            <button
              onClick={loadData}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.75rem' }}
              title="Refresh listings"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Matching Progress Notice */}
          {batchProgress && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
            }}>
              <RefreshCw size={16} className="animate-spin" color="#818cf8" />
              <span>{batchProgress}</span>
            </div>
          )}

          {/* Match Listings Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.5rem', minHeight: '160px', opacity: 0.6 }}>
                  <div style={{ width: '40%', height: '14px', background: 'var(--bg-surface)', borderRadius: '4px', marginBottom: '0.75rem' }} />
                  <div style={{ width: '75%', height: '18px', background: 'var(--bg-surface)', borderRadius: '4px', marginBottom: '1rem' }} />
                  <div style={{ width: '50%', height: '12px', background: 'var(--bg-surface)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <ShieldCheck size={32} color="#818cf8" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Jobs Matching Current Filter
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
                {jobs.length === 0
                  ? 'No job listings found in database. Go to Job Discovery to fetch opportunities.'
                  : 'Try clicking "Match All Jobs" or adjusting your search filters.'}
              </p>
              {jobs.length > 0 && (
                <button onClick={handleRunBatchMatch} className="btn btn-primary">
                  <Sparkles size={16} /> Run Match Engine on All Jobs
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1rem',
            }}>
              {sortedJobs.map((job) => {
                const score = job.match_score;
                const breakdown = job.match_breakdown || {};
                const scoreColor = score !== null ? getScoreColor(score) : '#6b7280';

                return (
                  <div key={job.id} className="job-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Header: Score Gauge + Company */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.6rem' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {job.company}
                        </div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.15rem 0' }}>
                          {job.title}
                        </h3>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={11} /> {job.location || 'Location unspecified'}
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '58px',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '8px',
                        background: score !== null ? `${scoreColor}15` : 'var(--bg-surface)',
                        border: `1px solid ${score !== null ? `${scoreColor}40` : 'var(--border-subtle)'}`,
                      }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: scoreColor }}>
                          {score !== null ? `${Math.round(score)}%` : '—'}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Match
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Dimension Bars */}
                    {score !== null && breakdown && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '0.35rem',
                        background: 'var(--bg-surface)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        margin: '0.5rem 0',
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Skills</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: getScoreColor(breakdown.skills || 0) }}>
                            {Math.round(breakdown.skills || 0)}%
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Edu</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: getScoreColor(breakdown.education || 0) }}>
                            {Math.round(breakdown.education || 0)}%
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Exp</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: getScoreColor(breakdown.experience || 0) }}>
                            {Math.round(breakdown.experience || 0)}%
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Loc</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: getScoreColor(breakdown.location || 0) }}>
                            {Math.round(breakdown.location || 0)}%
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Role</div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: getScoreColor(breakdown.role_relevance || 0) }}>
                            {Math.round(breakdown.role_relevance || 0)}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extracted Required Skills preview */}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div style={{ margin: '0.4rem 0' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          Required Skills ({job.required_skills.length}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {job.required_skills.slice(0, 4).map((s, idx) => (
                            <span key={idx} className="tag-chip" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                              {s}
                            </span>
                          ))}
                          {job.required_skills.length > 4 && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              +{job.required_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.6rem',
                      marginTop: 'auto',
                    }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                        {job.source || 'Manual'}
                      </span>

                      <button
                        onClick={() => handleViewMatch(job.id)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Eye size={12} /> Inspect Match Breakdown
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Interactive JD Analyzer Tab */}
      {activeTab === 'analyzer' && (
        <JDAnalyzerTool userProfile={profile} />
      )}

      {/* Match Detail Breakdown Modal */}
      {selectedJobId && (
        <MatchDetailModal
          matchData={matchDetails}
          loading={loadingDetails}
          onClose={() => { setSelectedJobId(null); setMatchDetails(null); }}
          onOpenMaterials={(m) => {
            const found = jobs.find(j => j.id === m.job_id);
            setMaterialsJob(found || { id: m.job_id, title: 'Job Role', company: 'Company' });
          }}
        />
      )}

      {/* Material Viewer & Studio Modal */}
      {materialsJob && (
        <MaterialViewerModal
          job={materialsJob}
          onClose={() => setMaterialsJob(null)}
          onMaterialsUpdated={loadData}
        />
      )}
    </div>
  );
}
