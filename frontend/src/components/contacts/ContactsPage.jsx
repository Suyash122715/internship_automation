import React, { useState, useEffect } from 'react';
import {
  User,
  Building,
  Mail,
  Globe,
  ShieldCheck,
  Shield,
  AlertTriangle,
  HelpCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Info,
  X
} from 'lucide-react';

const Linkedin = ({ size = 16, color = "currentColor", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
import {
  fetchContacts,
  deleteContact,
  updateContact,
  inferEmailPatterns,
  fetchContactStats
} from '../../services/api';
import AddContactModal from './AddContactModal';

const VERIFICATION_CONFIG = {
  VERIFIED: { label: 'Verified', color: '#10b981', badge: 'badge-success', icon: ShieldCheck, desc: 'Confirmed via official source' },
  PUBLIC: { label: 'Publicly Listed', color: '#818cf8', badge: 'badge-purple', icon: Shield, desc: 'Listed on public profile' },
  INFERRED: { label: 'Inferred', color: '#f59e0b', badge: 'badge-warning', icon: AlertTriangle, desc: 'Algorithmically guessed — not verified' },
  UNKNOWN: { label: 'Unknown', color: '#6b7280', badge: 'badge-gray', icon: HelpCircle, desc: 'Source unknown' },
};

const OUTREACH_STATUSES = [
  'CONTACT FOUND', 'EMAIL DRAFTED', 'APPROVED', 'SENT', 'REPLIED', 'NO RESPONSE', 'FOLLOW-UP', 'BOUNCED'
];

function ContactCard({ contact, onDelete, onStatusChange, onInferEmail }) {
  const [copied, setCopied] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const cfg = VERIFICATION_CONFIG[contact.verification_status] || VERIFICATION_CONFIG.UNKNOWN;
  const Icon = cfg.icon;

  const copyEmail = () => {
    if (contact.email) {
      navigator.clipboard.writeText(contact.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-card" style={{
      padding: '1.25rem',
      borderLeft: `4px solid ${cfg.color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      {/* Top row: Name + verification badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{contact.name}</h4>
            <span className={`badge ${cfg.badge}`} style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Icon size={11} /> {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {contact.role && <span style={{ fontWeight: 500 }}>{contact.role} </span>}
            {contact.role && <span style={{ color: 'var(--text-muted)' }}>@ </span>}
            <span style={{ color: '#818cf8', fontWeight: 600 }}>{contact.company}</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(contact.id)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}
          title="Delete contact"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Contact channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {contact.email ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <Mail size={14} color={contact.verification_status === 'INFERRED' ? '#f59e0b' : '#34d399'} />
            <span style={{ color: 'var(--text-primary)' }}>{contact.email}</span>
            {contact.verification_status === 'INFERRED' && (
              <span style={{ fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                INFERRED
              </span>
            )}
            <button onClick={copyEmail} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem' }}>
              {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <Mail size={14} />
            <span>Email unknown</span>
            <button
              onClick={() => onInferEmail(contact)}
              style={{
                fontSize: '0.7rem', padding: '0.15rem 0.5rem',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '4px',
                color: '#fbbf24',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Zap size={11} /> Infer Patterns
            </button>
          </div>
        )}

        {contact.linkedin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <Linkedin size={14} color="#818cf8" />
            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer"
              style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              LinkedIn Profile <ExternalLink size={11} />
            </a>
          </div>
        )}

        {contact.source && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontWeight: 500 }}>Source:</span>
            {contact.source_url ? (
              <a href={contact.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {contact.source} <ExternalLink size={11} />
              </a>
            ) : contact.source}
          </div>
        )}
      </div>

      {/* Verification info strip */}
      <div style={{
        fontSize: '0.72rem',
        padding: '0.4rem 0.6rem',
        background: `${cfg.color}10`,
        borderRadius: 'var(--radius-sm)',
        color: cfg.color,
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem'
      }}>
        <Icon size={12} />
        <span>{cfg.desc}</span>
        {contact.confidence_level && contact.confidence_level !== 'UNKNOWN' && (
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            Confidence: {contact.confidence_level}
          </span>
        )}
      </div>

      {/* Outreach status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Outreach:</span>
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="badge badge-purple"
          style={{ fontSize: '0.68rem', cursor: 'pointer', border: 'none' }}
        >
          {contact.outreach_status}
        </button>
        {showStatusMenu && (
          <div style={{
            position: 'absolute',
            right: 0,
            bottom: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            minWidth: '160px'
          }}>
            {OUTREACH_STATUSES.map(st => (
              <button
                key={st}
                onClick={() => { onStatusChange(contact.id, st); setShowStatusMenu(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  background: contact.outreach_status === st ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: 'none',
                  color: contact.outreach_status === st ? '#818cf8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Discovery notes */}
      {contact.discovery_notes && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
          {contact.discovery_notes}
        </div>
      )}
    </div>
  );
}

function InferEmailModal({ contact, onClose }) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleInfer = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await inferEmailPatterns(contact.id, domain.trim());
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = (addr, idx) => {
    navigator.clipboard.writeText(addr);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: '520px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Infer Email Patterns
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{contact.name} @ {contact.company}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Prominent warning */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            fontSize: '0.78rem',
            color: '#fbbf24'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>
                <strong>INFERRED patterns only.</strong> These are algorithmically generated guesses based on common company email formats. They have NOT been verified and may be wrong.
                Do NOT treat these as real email addresses. All results are labelled INFERRED.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="company.com"
              style={{
                flex: 1, padding: '0.6rem 0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '0.9rem'
              }}
            />
            <button
              onClick={handleInfer}
              disabled={loading || !domain.trim()}
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {error && <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}

          {result && (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {result.pattern_count} patterns generated — all marked INFERRED
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.patterns.map((p, i) => (
                  <div key={i} style={{
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{p.address}</div>
                      <div style={{ fontSize: '0.68rem', color: '#f59e0b' }}>INFERRED · LOW confidence · {p.pattern}</div>
                    </div>
                    <button onClick={() => copy(p.address, i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {copiedIdx === i ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [inferContact, setInferContact] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (searchTerm) params.q = searchTerm;
      if (verificationFilter !== 'ALL') params.verification_status = verificationFilter;
      const data = await fetchContacts(params);
      setContacts(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await fetchContactStats();
      setStats(s);
    } catch {}
  };

  useEffect(() => {
    loadContacts();
  }, [searchTerm, verificationFilter]);

  useEffect(() => {
    loadStats();
  }, [contacts.length]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await deleteContact(id);
      showToast('Contact deleted.');
      loadContacts();
      loadStats();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateContact(id, { outreach_status: newStatus });
      loadContacts();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2000,
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--text-primary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
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
            <span className="badge badge-success">Batch 7 Active</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              HR / Recruiter Contact Discovery & Management
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
            Recruiter & HR Contacts
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Store and manage real recruiter contacts with explicit verification classification. No fabricated data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Contact
          </button>
          <button onClick={loadContacts} disabled={loading} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Truthfulness rule banners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(VERIFICATION_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = stats?.verification_distribution?.[key] || 0;
          return (
            <div key={key} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: cfg.color, fontWeight: 600, fontSize: '0.85rem' }}>
                  <Icon size={16} /> {cfg.label}
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search name, company, role…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-primary)', width: '100%',
              fontSize: '0.85rem', outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'VERIFIED', 'PUBLIC', 'INFERRED', 'UNKNOWN'].map(st => (
            <button
              key={st}
              onClick={() => setVerificationFilter(st)}
              className={`btn btn-${verificationFilter === st ? 'primary' : 'secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Total count */}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {loading ? 'Loading…' : `${total} contact${total !== 1 ? 's' : ''} found`}
      </div>

      {/* Contacts grid */}
      {!loading && contacts.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <User size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p>No contacts found. Add your first recruiter contact using the button above.</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <Plus size={16} /> Add First Contact
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {contacts.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onInferEmail={(contact) => setInferContact(contact)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { loadContacts(); loadStats(); showToast('Contact added successfully.'); }}
        />
      )}
      {inferContact && (
        <InferEmailModal
          contact={inferContact}
          onClose={() => setInferContact(null)}
        />
      )}
    </div>
  );
}
