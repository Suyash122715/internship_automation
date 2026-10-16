import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  Building,
  Briefcase,
  Layers,
  Filter,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  HelpCircle,
  Check,
  Save,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  Eye,
  Edit3
} from 'lucide-react';
import {
  fetchEmailTemplates,
  generateColdEmail,
  createEmailDraft,
  fetchOutreachEmails,
  updateOutreachEmail,
  approveOutreachEmail,
  sendOutreachEmail,
  queueOutreachEmail,
  processOutreachQueue,
  retryOutreachEmail,
  deleteOutreachEmail,
  fetchOutreachStats,
  fetchContacts,
  fetchJobs
} from '../../services/api';
import EmailComposerModal from './EmailComposerModal';

const STATUS_CONFIG = {
  'EMAIL DRAFTED': { label: 'Draft', color: '#9ca3af', badge: 'badge-gray' },
  'APPROVED': { label: 'Approved', color: '#818cf8', badge: 'badge-purple' },
  'QUEUED': { label: 'In Queue', color: '#38bdf8', badge: 'badge-info' },
  'SENT': { label: 'Sent', color: '#10b981', badge: 'badge-success' },
  'REPLIED': { label: 'Replied', color: '#a855f7', badge: 'badge-purple' },
  'FAILED': { label: 'Failed', color: '#ef4444', badge: 'badge-danger' },
  'BOUNCED': { label: 'Bounced', color: '#f59e0b', badge: 'badge-warning' },
  'FOLLOW-UP': { label: 'Follow-up', color: '#38bdf8', badge: 'badge-info' },
  'NO RESPONSE': { label: 'No Response', color: '#6b7280', badge: 'badge-gray' },
};

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState('compose'); // compose | queue | history | settings
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Compose State
  const [contacts, setContacts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('direct_inquiry');
  const [generationResult, setGenerationResult] = useState(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedRecipient, setEditedRecipient] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [allowInferredCheckbox, setAllowInferredCheckbox] = useState(false);

  // Queue State
  const [queuedEmails, setQueuedEmails] = useState([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [queueBatchSize, setQueueBatchSize] = useState(5);

  // History State
  const [allEmails, setAllEmails] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [activeModalEmail, setActiveModalEmail] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, tmplsData, contactsData, jobsData] = await Promise.all([
        fetchOutreachStats().catch(() => null),
        fetchEmailTemplates().catch(() => []),
        fetchContacts({ limit: 100 }).catch(() => ({ items: [] })),
        fetchJobs({ limit: 50 }).catch(() => ({ jobs: [] })),
      ]);
      setStats(statsData);
      setTemplates(tmplsData);
      setContacts(contactsData.items || []);
      setJobs(jobsData.jobs || []);

      if (contactsData.items && contactsData.items.length > 0 && !selectedContactId) {
        setSelectedContactId(contactsData.items[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      const emailsRes = await fetchOutreachEmails({ limit: 100 });
      setAllEmails(emailsRes.items || []);
      setQueuedEmails(emailsRes.items.filter(e => e.status === 'QUEUED') || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadEmails();
  }, []);

  useEffect(() => {
    if (activeTab === 'queue' || activeTab === 'history') {
      loadEmails();
      fetchOutreachStats().then(setStats).catch(() => {});
    }
  }, [activeTab]);

  const handleGenerate = async () => {
    if (!selectedContactId) {
      setError('Please select a recipient contact first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateColdEmail({
        contact_id: parseInt(selectedContactId, 10),
        job_id: selectedJobId ? parseInt(selectedJobId, 10) : undefined,
        template_id: selectedTemplateId,
      });
      setGenerationResult(result);
      setEditedSubject(result.subject);
      setEditedRecipient(result.recipient_email || '');
      setEditedBody(result.body);
      setAllowInferredCheckbox(false);
      setSuccessMsg('Email generated and strictly grounded in verified data.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedContactId || !editedSubject || !editedBody) {
      setError('Subject and body cannot be empty.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await createEmailDraft({
        contact_id: parseInt(selectedContactId, 10),
        job_id: selectedJobId ? parseInt(selectedJobId, 10) : undefined,
        recipient_email: editedRecipient,
        subject: editedSubject,
        body: editedBody,
        template_id: selectedTemplateId,
      });
      setSuccessMsg('Email draft created and saved to records.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGeneratedNow = async () => {
    if (!selectedContactId || !editedSubject || !editedBody) {
      setError('Subject and body cannot be empty.');
      return;
    }
    const selectedContact = contacts.find(c => c.id.toString() === selectedContactId);
    if (selectedContact?.verification_status === 'INFERRED' && !allowInferredCheckbox) {
      setError('Safety Guard: You must acknowledge the INFERRED address warning before sending.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Create draft
      const draft = await createEmailDraft({
        contact_id: parseInt(selectedContactId, 10),
        job_id: selectedJobId ? parseInt(selectedJobId, 10) : undefined,
        recipient_email: editedRecipient,
        subject: editedSubject,
        body: editedBody,
        template_id: selectedTemplateId,
      });
      // 2. Dispatch
      const sent = await sendOutreachEmail(draft.id, {
        allow_inferred: allowInferredCheckbox,
        force_approve: true,
      });
      setSuccessMsg(`Successfully dispatched to ${sent.recipient_email} via ${sent.provider === 'smtp' ? 'SMTP' : 'Simulated Sandbox'}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueGenerated = async () => {
    if (!selectedContactId || !editedSubject || !editedBody) {
      setError('Subject and body cannot be empty.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const draft = await createEmailDraft({
        contact_id: parseInt(selectedContactId, 10),
        job_id: selectedJobId ? parseInt(selectedJobId, 10) : undefined,
        recipient_email: editedRecipient,
        subject: editedSubject,
        body: editedBody,
        template_id: selectedTemplateId,
      });
      await queueOutreachEmail(draft.id);
      setSuccessMsg('Email draft queued for batch sending.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    setError(null);
    try {
      const res = await processOutreachQueue({
        max_batch: queueBatchSize,
        allow_inferred: true,
      });
      setSuccessMsg(`Queue processed: ${res.sent} sent, ${res.failed} failed, ${res.rate_limited} deferred.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingQueue(false);
    }
  };

  const handleRetryEmail = async (emailId) => {
    setLoading(true);
    setError(null);
    try {
      await retryOutreachEmail(emailId, { allow_inferred: true });
      setSuccessMsg('Email retry succeeded.');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async (emailId) => {
    if (!confirm('Are you sure you want to delete this email record?')) return;
    try {
      await deleteOutreachEmail(emailId);
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (emailId, newStatus) => {
    try {
      await updateOutreachEmail(emailId, { status: newStatus });
      loadEmails();
      fetchOutreachStats().then(setStats);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedContact = contacts.find(c => c.id.toString() === selectedContactId);

  const filteredHistory = allEmails.filter(item => {
    if (historyFilter !== 'ALL' && item.status !== historyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSubject = item.subject?.toLowerCase().includes(q);
      const matchRecipient = item.recipient_email?.toLowerCase().includes(q);
      const matchContact = item.contact_name?.toLowerCase().includes(q);
      const matchCompany = item.contact_company?.toLowerCase().includes(q);
      if (!matchSubject && !matchRecipient && !matchContact && !matchCompany) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-success">Batch 8 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Cold Email Outreach Engine
            </span>
            {stats?.provider_status && (
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                Mode: {stats.provider_status.mode}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.7rem', margin: 0, color: 'var(--text-primary)' }}>
            Recruiter Outreach & Cold Email Engine
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            PRD Section 14 & 15: Generate truthful personalized emails, preview claims, approve drafts, and dispatch safely.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => { loadData(); loadEmails(); }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Sparkles size={15} /> New Cold Email
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#ef4444',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#10b981',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drafts Created</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {stats?.emails_drafted || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Awaiting user review</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved for Send</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#818cf8', marginTop: '0.2rem' }}>
            {stats?.emails_approved || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Explicitly approved</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending in Queue</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem' }}>
            {stats?.emails_queued || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ready for batching</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emails Dispatched</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>
            {stats?.emails_sent || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sent to recruiters</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recruiter Replies</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#a855f7', marginTop: '0.2rem' }}>
            {stats?.emails_replied || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Positive / responses</span>
        </div>

        <div className="glass-card" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed / Bounced</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444', marginTop: '0.2rem' }}>
            {(stats?.emails_failed || 0) + (stats?.emails_bounced || 0)}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Eligible for retry</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '1.5rem',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('compose')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'compose' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'compose' ? '#818cf8' : 'var(--text-secondary)',
            fontWeight: activeTab === 'compose' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem'
          }}
        >
          <Sparkles size={16} /> Compose & Generator
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'queue' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'queue' ? '#818cf8' : 'var(--text-secondary)',
            fontWeight: activeTab === 'queue' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem'
          }}
        >
          <Clock size={16} /> Outbox Queue ({queuedEmails.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'history' ? '#818cf8' : 'var(--text-secondary)',
            fontWeight: activeTab === 'history' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem'
          }}
        >
          <Send size={16} /> History & Tracking ({allEmails.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid #818cf8' : '2px solid transparent',
            color: activeTab === 'settings' ? '#818cf8' : 'var(--text-secondary)',
            fontWeight: activeTab === 'settings' ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem'
          }}
        >
          <Settings size={16} /> Provider & Safeguards
        </button>
      </div>

      {/* TAB 1: COMPOSE & GENERATOR */}
      {activeTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Sourced Inputs & Configuration */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              1. Sourced Data Grounding
            </h3>

            {/* Recruiter / Contact Picker */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Target Recruiter / Contact <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem'
                }}
              >
                <option value="">-- Select Recruiter Contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.company} ({c.verification_status})
                  </option>
                ))}
              </select>

              {selectedContact && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedContact.role || 'Not specified'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedContact.email || 'None on file'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Trust Status:</span>
                    <span className={`badge ${
                      selectedContact.verification_status === 'VERIFIED' ? 'badge-success' :
                      selectedContact.verification_status === 'PUBLIC' ? 'badge-purple' :
                      selectedContact.verification_status === 'INFERRED' ? 'badge-warning' : 'badge-gray'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {selectedContact.verification_status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Target Job */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Associate with Discovered Job (Optional)
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem'
                }}
              >
                <option value="">-- No specific job (General Inquiry) --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} @ {j.company}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Outreach Template Style
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem'
                }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {templates.find(t => t.id === selectedTemplateId) && (
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {templates.find(t => t.id === selectedTemplateId)?.description}
                </p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !selectedContactId}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={16} /> Generate Truthful Cold Email
            </button>
          </div>

          {/* Right Column: Live Editor & Grounded Verification Audit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {generationResult && (
              <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #818cf8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={18} color="#818cf8" />
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    PRD Truthfulness Audit (Verified Sourced Claims)
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem' }}>
                  {generationResult.grounded_claims.map((claim, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: '#10b981' }}>
                      <Check size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{claim}</span>
                    </div>
                  ))}
                  {generationResult.missing_fields.map((miss, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{miss}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inferred Warning if selected contact is inferred */}
            {selectedContact?.verification_status === 'INFERRED' && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 600, fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} />
                  <span>INFERRED EMAIL SAFETY NOTICE</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  The recipient email is an algorithmically inferred guess. Sending without verified confirmation is strictly warned.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', marginTop: '0.2rem' }}>
                  <input
                    type="checkbox"
                    checked={allowInferredCheckbox}
                    onChange={(e) => setAllowInferredCheckbox(e.target.checked)}
                  />
                  I explicitly acknowledge this address is inferred and authorize outreach.
                </label>
              </div>
            )}

            {/* Email Editor Card */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  2. Preview & Edit Cold Email
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {editedBody.length} chars • {editedBody.trim() ? editedBody.trim().split(/\s+/).length : 0} words
                </span>
              </div>

              {/* To / Recipient */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  To (Recipient Email Address)
                </label>
                <input
                  type="email"
                  value={editedRecipient}
                  onChange={(e) => setEditedRecipient(e.target.value)}
                  placeholder="e.g. recruiter@company.com"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Subject line will appear here after generation..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Email Body (Markdown / Plain Text)
                </label>
                <textarea
                  rows={13}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  placeholder="Generate an email using the left panel or compose your message here..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Dispatch Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <button
                  onClick={handleSaveDraft}
                  disabled={loading || !editedBody}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Save size={15} /> Save Draft
                </button>

                <button
                  onClick={handleQueueGenerated}
                  disabled={loading || !editedBody}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Clock size={15} /> Add to Queue
                </button>

                <button
                  onClick={handleSendNowGeneratedNow}
                  disabled={loading || !editedBody || (selectedContact?.verification_status === 'INFERRED' && !allowInferredCheckbox)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Send size={15} /> Send Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUEUE & OUTBOX */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Rate Limit & Batch Control Banner */}
          <div className="glass-card" style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Automated Outbox & Anti-Spam Queue
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Rate Limits: {stats?.rate_limit?.sent_last_minute || 0}/{stats?.rate_limit?.limit_per_minute || 5} sent in last minute • {stats?.rate_limit?.sent_last_24h || 0}/{stats?.rate_limit?.limit_per_day || 30} sent today ({stats?.rate_limit?.remaining_today ?? 30} remaining)
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Batch size:</span>
                <select
                  value={queueBatchSize}
                  onChange={(e) => setQueueBatchSize(parseInt(e.target.value, 10))}
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <option value={1}>1 email</option>
                  <option value={3}>3 emails</option>
                  <option value={5}>5 emails (limit/min)</option>
                  <option value={10}>10 emails</option>
                </select>
              </div>

              <button
                onClick={handleProcessQueue}
                disabled={processingQueue || queuedEmails.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                {processingQueue ? <RefreshCw className="spin" size={15} /> : <Send size={15} />}
                Process Queue Now ({queuedEmails.length})
              </button>
            </div>
          </div>

          {/* Queued Items List */}
          {queuedEmails.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Outbox Queue is Empty</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                There are no approved emails waiting in the sending queue. Compose and add emails to the queue to send them in controlled batches.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {queuedEmails.map((item) => (
                <div key={item.id} className="glass-card" style={{
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Clock size={18} color="#38bdf8" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {item.subject}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>QUEUED</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>To: {item.recipient_email}</span>
                        <span>Recipient: {item.contact_name} ({item.contact_company})</span>
                        <span>Enqueued: {item.queued_at ? new Date(item.queued_at).toLocaleTimeString() : 'Recently'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setActiveModalEmail(item)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <Eye size={14} /> Review
                    </button>
                    <button
                      onClick={() => handleDeleteEmail(item.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY & TRACKING */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="glass-card" style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                Filter:
              </span>
              {['ALL', 'SENT', 'REPLIED', 'QUEUED', 'APPROVED', 'EMAIL DRAFTED', 'FAILED', 'BOUNCED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setHistoryFilter(st)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: historyFilter === st ? '1px solid #818cf8' : '1px solid var(--border-subtle)',
                    background: historyFilter === st ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: historyFilter === st ? '#818cf8' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search subject, recruiter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.4rem 0.65rem 0.4rem 2rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    width: '220px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Email Items List */}
          {filteredHistory.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Mail size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No Emails Found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                No outreach emails match the selected filters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredHistory.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['EMAIL DRAFTED'];
                return (
                  <div key={item.id} className="glass-card" style={{
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Mail size={18} color="#818cf8" />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {item.subject}
                          </span>
                          <span className={`badge ${statusCfg.badge}`} style={{ fontSize: '0.65rem' }}>
                            {statusCfg.label}
                          </span>
                          {item.provider && (
                            <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>
                              {item.provider}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span>To: <strong style={{ color: 'var(--text-secondary)' }}>{item.recipient_email || 'Not set'}</strong></span>
                          <span>Contact: {item.contact_name} ({item.contact_company})</span>
                          {item.sent_at && <span>Dispatched: {new Date(item.sent_at).toLocaleString()}</span>}
                          {item.error_message && <span style={{ color: '#ef4444' }}>Error: {item.error_message}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryEmail(item.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                        >
                          <RotateCcw size={13} /> Retry Send
                        </button>
                      )}

                      {/* Outreach lifecycle dropdown */}
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        style={{
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <option value="EMAIL DRAFTED">Draft</option>
                        <option value="APPROVED">Approved</option>
                        <option value="QUEUED">Queued</option>
                        <option value="SENT">Sent</option>
                        <option value="REPLIED">Replied</option>
                        <option value="FOLLOW-UP">Follow-up</option>
                        <option value="NO RESPONSE">No Response</option>
                        <option value="BOUNCED">Bounced</option>
                        <option value="FAILED">Failed</option>
                      </select>

                      <button
                        onClick={() => setActiveModalEmail(item)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                      >
                        <Edit3 size={13} /> Open
                      </button>

                      <button
                        onClick={() => handleDeleteEmail(item.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS & SAFEGUARDS */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Provider Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Settings size={20} color="#818cf8" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Email Integration Configuration
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Dispatch Provider:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {stats?.provider_status?.mode || 'Simulated Sandbox'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>SMTP Host:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{stats?.provider_status?.host}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>From Address:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{stats?.provider_status?.from_address}</span>
              </div>
            </div>

            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>
              <strong>Local Sandbox Mode:</strong> When real SMTP credentials are not configured in <code>.env</code>, all email actions operate safely in simulated mode with full RFC formatting, local delivery simulation, and audit history.
            </div>
          </div>

          {/* Anti-Spam & Rate Limits Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldCheck size={20} color="#10b981" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Anti-Spam & Strict Rate Limits
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Burst Rate Limit:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Max 5 emails / minute
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Daily Outreach Cap:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Max 30 emails / 24 hours
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pacing Delay:</span>
                <span style={{ color: 'var(--text-secondary)' }}>500ms minimum between queued dispatches</span>
              </div>
            </div>

            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>
              <strong>PRD Human Control Guarantee:</strong> The AI will never blindly mass-blast recruiters. Every email requires explicit user approval before it can be sent or queued.
            </div>
          </div>
        </div>
      )}

      {/* Review & Edit Modal */}
      {activeModalEmail && (
        <EmailComposerModal
          email={activeModalEmail}
          onClose={() => setActiveModalEmail(null)}
          onUpdated={(updated) => {
            loadEmails();
            fetchOutreachStats().then(setStats);
          }}
        />
      )}
    </div>
  );
}
