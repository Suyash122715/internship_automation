import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Upload,
  Send,
  HelpCircle,
  Lock,
  ExternalLink,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { detectApplicationFields, fillApplicationForm, submitApplication } from '../../services/api';

export default function ApplicationAssistantModal({ job, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('detect'); // 'detect' | 'review' | 'submitted'
  const [formUrl, setFormUrl] = useState(job?.application_url || '');
  const [detectedData, setDetectedData] = useState(null);
  const [customAnswers, setCustomAnswers] = useState({});
  const [userApproved, setUserApproved] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Auto-detect on open if job has URL
  useEffect(() => {
    if (job?.application_url) {
      handleDetect();
    }
  }, [job]);

  const handleDetect = async () => {
    if (!formUrl) {
      setErrorMessage('Application URL is required.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Launching browser & inspecting application form...');
    try {
      const res = await detectApplicationFields({
        job_id: job?.id,
        url: formUrl,
        headless: true
      });
      setDetectedData(res);
      setStep('review');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to detect application fields.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleFillFields = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Auto-filling safe profile fields & attaching documents...');
    try {
      const res = await fillApplicationForm({
        job_id: job?.id,
        url: formUrl,
        custom_answers: customAnswers,
        attach_resume: true,
        attach_cover_letter: true,
        headless: true
      });
      setDetectedData(res);
      setStatusMessage('✓ Form successfully populated and reviewed.');
      setTimeout(() => setStatusMessage(''), 3500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to populate form.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userApproved) {
      setErrorMessage('Explicit user approval is required before submission (PRD Section 12).');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage('Dispatching application with explicit user approval...');
    try {
      const res = await submitApplication({
        job_id: job?.id,
        url: formUrl,
        user_approved: true,
        headless: true
      });
      setSubmissionResult(res);
      setStep('submitted');
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Application submission encountered an issue.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleAnswerChange = (fieldName, val) => {
    setCustomAnswers(prev => ({
      ...prev,
      [fieldName]: val
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-lg)',
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
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accent-primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Play size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
                  Browser Application Assistant
                </h3>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Batch 6</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {job ? `${job.title} @ ${job.company}` : 'Manual Application URL Flow'}
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
              padding: '0.25rem',
              borderRadius: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* Error Alert */}
          {errorMessage && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Status Alert */}
          {statusMessage && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Step 1: Detect / URL input */}
          {step === 'detect' && (
            <div>
              <div style={{
                background: 'rgba(17, 24, 39, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                  Application Form URL:
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://jobs.example.com/apply/12345"
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  />
                  <button
                    onClick={handleDetect}
                    disabled={loading || !formUrl}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                  >
                    <Play size={16} /> Detect Fields
                  </button>
                </div>
              </div>

              {/* Safety banner */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <ShieldCheck size={16} /> Truthful Auto-Fill
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Populates verified names, contact info, education, and URLs directly from your confirmed profile.
                  </p>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <HelpCircle size={16} /> Zero Guesswork Rule
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Any custom essay question or unknown criteria is highlighted for your direct input. No AI fabrication.
                  </p>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <Lock size={16} /> Explicit Approval Required
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    The assistant stops at the final review screen. Applications are never submitted without explicit user signoff.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review Screen (PRD Section 12) */}
          {step === 'review' && detectedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* CAPTCHA / Anti-bot alert if detected */}
              {detectedData.captcha_detected && (
                <div style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <AlertTriangle size={18} color="#f87171" /> Anti-Bot / CAPTCHA Challenge Detected
                  </div>
                  <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>
                    Per PRD Rule #7, the assistant will NOT attempt to bypass anti-bot mechanisms. Please resolve the verification challenge manually in the open browser window, then proceed with the review.
                  </p>
                </div>
              )}

              {/* Status Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge badge-${detectedData.status === 'READY' ? 'success' : 'purple'}`}>
                    Status: {detectedData.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {detectedData.detected_fields?.length || 0} fields detected • {detectedData.unknown_questions?.length || 0} custom questions
                  </span>
                </div>
                <button
                  onClick={handleFillFields}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Sparkles size={14} color="#818cf8" /> Auto-Fill Safe Fields
                </button>
              </div>

              {/* Document Attachments Status */}
              <div style={{
                background: 'rgba(17, 24, 39, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.75rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={16} color="#818cf8" /> Application Document Attachments
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}>
                    <FileText size={18} color="#34d399" />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tailored Resume PDF
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {detectedData.resume_attached ? '✓ Verified & Attached' : 'Selected Tailored Resume'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}>
                    <FileText size={18} color="#818cf8" />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tailored Cover Letter
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {detectedData.cover_letter_attached ? '✓ Verified & Attached' : 'Tailored Cover Letter File'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detected Fields Grid */}
              <div style={{
                background: 'rgba(17, 24, 39, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.75rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} color="#34d399" /> Verified Profile Field Mapping
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {detectedData.detected_fields?.map((f, i) => (
                    <div key={i} style={{
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {f.field_name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: f.filled_value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>
                          {f.filled_value || '(Pending fill)'}
                        </div>
                      </div>
                      <span className={`badge badge-${f.is_filled ? 'success' : 'purple'}`} style={{ fontSize: '0.65rem' }}>
                        {f.is_filled ? 'Filled' : f.classification}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unknown / Custom Questions Section (Rule: Zero Guesswork) */}
              {detectedData.unknown_questions && detectedData.unknown_questions.length > 0 && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <HelpCircle size={18} color="#fbbf24" />
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: '#fbbf24' }}>
                        Custom & Unknown Questions (Requires User Input)
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        In accordance with Rule #2 & #3, AI never fabricates or guesses custom application responses.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {detectedData.unknown_questions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {q.label || q.field_name}
                        </label>
                        <textarea
                          rows={2}
                          value={customAnswers[q.field_name] || ''}
                          onChange={(e) => handleAnswerChange(q.field_name, e.target.value)}
                          placeholder="Type your authentic response here..."
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explicit User Approval Section (PRD Section 12 Requirement) */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={userApproved}
                    onChange={(e) => setUserApproved(e.target.checked)}
                    style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#6366f1' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                      Explicit User Review & Submission Approval
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                      I have reviewed all filled fields, attached resume and cover letter, and confirm that all details are accurate. I authorize the assistant to submit this application.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Submitted Confirmation Screen */}
          {step === 'submitted' && submissionResult && (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={36} color="#34d399" />
              </div>

              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                  Application Successfully Submitted!
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
                  {submissionResult.message || 'Your application was dispatched with explicit approval and registered in the tracking pipeline.'}
                </p>
              </div>

              <div style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                textAlign: 'left',
                width: '100%',
                maxWidth: '420px'
              }}>
                <div><strong>Submission Status:</strong> {submissionResult.status}</div>
                <div><strong>Submitted At:</strong> {new Date(submissionResult.applied_at).toLocaleString()}</div>
                <div><strong>Target Role:</strong> {job?.title || 'Internship Application'}</div>
              </div>

              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Close & Return to Pipeline
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}>
            <button
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary"
            >
              Cancel
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleSubmit}
                disabled={loading || !userApproved}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: userApproved ? 1 : 0.6
                }}
              >
                <Send size={16} /> Confirm & Submit Application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
