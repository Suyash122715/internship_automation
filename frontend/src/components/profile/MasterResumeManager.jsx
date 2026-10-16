import React, { useState, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  FileCheck,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { uploadResumeFile, getResumeDownloadUrl, deleteResumeFile, updateResumeTextContent } from '../../services/api';

export default function MasterResumeManager({ profile, onProfileUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [isEditingText, setIsEditingText] = useState(false);
  const [resumeText, setResumeText] = useState(profile?.master_resume_text || '');
  const [savingText, setSavingText] = useState(false);

  const fileInputRef = useRef(null);
  const metadata = profile?.resume_metadata;
  const hasResume = metadata?.has_file;

  // Format bytes to human readable
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const res = await uploadResumeFile(file);
      setUploadSuccess(res.message || 'Resume uploaded successfully.');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your master resume?')) return;
    try {
      await deleteResumeFile();
      setUploadSuccess('Resume deleted.');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setUploadError(err.message || 'Failed to delete resume.');
    }
  };

  const handleSaveText = async () => {
    setSavingText(true);
    try {
      await updateResumeTextContent(resumeText);
      setIsEditingText(false);
      setUploadSuccess('Extracted resume text updated successfully.');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setUploadError(err.message || 'Failed to update resume text.');
    } finally {
      setSavingText(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#818cf8" /> Master Resume & Extracted Source
          </h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>
            The authoritative baseline resume used for AI matching, analysis, and tailored applications
          </p>
        </div>
        <span className={`badge ${hasResume ? 'badge-success' : 'badge-warning'}`}>
          {hasResume ? 'Master Resume Active' : 'No Resume Uploaded'}
        </span>
      </div>

      {/* Truthfulness Notice */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.85rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <ShieldCheck size={20} color="#34d399" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>PRD AI Safety Guarantee:</strong> All text extracted from this document is preserved verbatim without fabrication. Future batch generators will only draw truthful statements directly from your profile.
        </div>
      </div>

      {/* Notifications */}
      {uploadError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          color: '#fca5a5',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} /> {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          color: '#6ee7b7',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} /> {uploadSuccess}
        </div>
      )}

      {/* File Dropzone */}
      <div
        className={`file-dropzone ${isDragging ? 'drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: '1.5rem' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          style={{ display: 'none' }}
        />
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.75rem auto'
        }}>
          {uploading ? (
            <RefreshCw size={24} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <UploadCloud size={24} color="#818cf8" />
          )}
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {uploading ? 'Processing & Parsing Resume...' : 'Click to upload or drag & drop resume file'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Supported formats: PDF, DOCX, TXT (Max 15MB)
        </div>
      </div>

      {/* Uploaded File Info Card */}
      {hasResume && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileCheck size={22} color="#38bdf8" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {metadata?.original_name || metadata?.filename || 'Master Resume'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.15rem' }}>
                  <span>Size: {formatBytes(metadata?.file_size)}</span>
                  <span>•</span>
                  <span>Type: {metadata?.mime_type || 'Document'}</span>
                  <span>•</span>
                  <span>Chars: {metadata?.text_length || 0}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={getResumeDownloadUrl()}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              >
                <Download size={14} /> Download
              </a>
              <button
                onClick={handleDeleteResume}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: '#ef4444' }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Text Content Viewer & Editor */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Extracted Text Content ({profile?.master_resume_text?.length || 0} characters)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isEditingText ? (
              <>
                <button
                  onClick={() => { setIsEditingText(false); setResumeText(profile?.master_resume_text || ''); }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveText}
                  disabled={savingText}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  <Save size={12} /> {savingText ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setIsEditingText(true); setResumeText(profile?.master_resume_text || ''); }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                <Edit3 size={12} /> Edit Text
              </button>
            )}
          </div>
        </div>

        {isEditingText ? (
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="form-textarea"
            style={{ minHeight: '280px', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: '1.4' }}
          />
        ) : (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            maxHeight: '300px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}>
            {profile?.master_resume_text || (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No text extracted yet. Upload a resume or click "Edit Text" to paste your resume content directly.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
