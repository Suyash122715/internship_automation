import React, { useState } from 'react';
import {
  X,
  Mail,
  User,
  Building,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Save,
  Check,
  ShieldCheck,
  Shield,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  updateOutreachEmail,
  approveOutreachEmail,
  sendOutreachEmail,
  queueOutreachEmail
} from '../../services/api';

const STATUS_CONFIG = {
  'EMAIL DRAFTED': { label: 'Draft', color: '#9ca3af', badge: 'badge-gray' },
  'APPROVED': { label: 'Approved', color: '#818cf8', badge: 'badge-purple' },
  'QUEUED': { label: 'In Queue', color: '#38bdf8', badge: 'badge-info' },
  'SENT': { label: 'Sent', color: '#10b981', badge: 'badge-success' },
  'REPLIED': { label: 'Replied', color: '#a855f7', badge: 'badge-purple' },
  'FAILED': { label: 'Failed', color: '#ef4444', badge: 'badge-danger' },
  'BOUNCED': { label: 'Bounced', color: '#f59e0b', badge: 'badge-warning' },
};

export default function EmailComposerModal({
  email,
  onClose,
  onUpdated,
}) {
  const [subject, setSubject] = useState(email?.subject || '');
  const [body, setBody] = useState(email?.body || '');
  const [recipient, setRecipient] = useState(email?.recipient_email || '');
  const [allowInferred, setAllowInferred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!email) return null;

  const isInferred = email.contact_verification_status === 'INFERRED';
  const statusCfg = STATUS_CONFIG[email.status] || STATUS_CONFIG['EMAIL DRAFTED'];

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateOutreachEmail(email.id, {
        subject,
        body,
        recipient_email: recipient,
      });
      setSuccessMsg('Email draft saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      // Save any pending text edits first
      await updateOutreachEmail(email.id, {
        subject,
        body,
        recipient_email: recipient,
      });
      const approved = await approveOutreachEmail(email.id);
      setSuccessMsg('Email successfully marked APPROVED for sending.');
      setTimeout(() => setSuccessMsg(null), 3000);
      if (onUpdated) onUpdated(approved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (isInferred && !allowInferred) {
      setError('Safety Guard: You must explicitly check the confirmation box before sending to an INFERRED address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Save latest edits first
      await updateOutreachEmail(email.id, {
        subject,
        body,
        recipient_email: recipient,
      });
      const sent = await sendOutreachEmail(email.id, {
        allow_inferred: allowInferred,
        force_approve: true,
      });
      setSuccessMsg(`Dispatched successfully via ${sent.provider === 'smtp' ? 'SMTP' : 'Simulated Sandbox'}!`);
      setTimeout(() => {
        if (onUpdated) onUpdated(sent);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateOutreachEmail(email.id, {
        subject,
        body,
        recipient_email: recipient,
      });
      const queued = await queueOutreachEmail(email.id);
      setSuccessMsg('Email added to outgoing queue.');
      setTimeout(() => {
        if (onUpdated) onUpdated(queued);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Cold Email Review & Dispatch
                </h3>
                <span className={`badge ${statusCfg.badge}`} style={{ fontSize: '0.7rem' }}>
                  {statusCfg.label}
                </span>
                {email.user_edited === 1 && (
                  <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                    Edited by User
                  </span>
                )}
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                To: {email.contact_name || 'Recruiter'} at {email.contact_company || 'Company'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              gap: '0.5rem'
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
              gap: '0.5rem'
            }}>
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Inferred Warning Alert */}
          {isInferred && (
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 600, fontSize: '0.85rem' }}>
                <AlertTriangle size={16} />
                <span>INFERRED EMAIL NOTICE (PRD Truthfulness Requirement)</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                This contact address was generated algorithmically from common corporate patterns and is <strong>not confirmed</strong>. Ensure you review the address before dispatch.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowInferred}
                  onChange={(e) => setAllowInferred(e.target.checked)}
                />
                I understand this address is inferred and explicitly authorize sending.
              </label>
            </div>
          )}

          {/* Recipient Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              To (Recipient Email Address)
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
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

          {/* Subject Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
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

          {/* Body Textarea */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Email Body Content
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {body.length} characters • {body.trim() ? body.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <textarea
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Save size={15} /> Save Draft
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {email.status !== 'APPROVED' && email.status !== 'SENT' && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <Check size={15} /> Approve
              </button>
            )}

            {email.status !== 'SENT' && (
              <button
                onClick={handleQueue}
                disabled={loading}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <Clock size={15} /> Add to Queue
              </button>
            )}

            <button
              onClick={handleSendNow}
              disabled={loading || (isInferred && !allowInferred)}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <Send size={15} /> Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
