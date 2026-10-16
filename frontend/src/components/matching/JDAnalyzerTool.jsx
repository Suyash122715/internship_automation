import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Tag,
  Briefcase,
  Award,
  Layers,
  ShieldCheck,
  Check,
  XCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { analyzeJDText } from '../../services/api';

const SAMPLE_JD = `Software Engineer Intern - Backend (Summer 2025)

About the Role:
We are looking for an enthusiastic Software Engineer Intern to join our Core Platform team. You will work on high-throughput distributed microservices, develop scalable REST APIs, and contribute to production cloud infrastructure.

Required Qualifications:
- Currently pursuing a Bachelor's or Master's degree in Computer Science, Software Engineering, or related technical field
- Strong proficiency in Python, Go, or Java
- Solid understanding of Data Structures, Algorithms, and Object-Oriented Design
- Experience with relational databases like PostgreSQL or MySQL
- Familiarity with Git version control and RESTful APIs

Preferred / Nice-to-Have:
- Experience with Docker, Kubernetes, or AWS cloud services
- Knowledge of Redis or message brokers like Kafka / RabbitMQ
- Previous internship experience or demonstrated personal projects in backend engineering
- Familiarity with FastAPI or Django

Responsibilities:
- Design, test, and deploy clean, maintainable backend services
- Collaborate with frontend engineers and product managers to define API contracts
- Participate in code reviews and agile sprint planning`;

export default function JDAnalyzerTool({ userProfile }) {
  const [jdText, setJdText] = useState(SAMPLE_JD);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeJDText(jdText);
      setAnalysisResult(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze job description');
    } finally {
      setAnalyzing(false);
    }
  };

  const userSkills = (userProfile?.skills || []).map((s) => s.toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Description & Instruction Banner */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <BookOpen size={18} color="#818cf8" />
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
            Interactive Job Description Parser & Requirement Classifier
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
          Paste any job description below. The parser extracts required vs preferred skills, degree qualifications, experience expectations, and responsibilities using deterministic NLP pattern matching with zero hallucinations.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(340px, 1.2fr)',
        gap: '1.25rem',
      }}>
        {/* Left: Input Editor */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Raw Job Description Text
            </span>
            <button
              type="button"
              onClick={() => setJdText(SAMPLE_JD)}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              <RotateCcw size={12} /> Load Sample JD
            </button>
          </div>

          <textarea
            className="form-input"
            rows={18}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste complete job description text here..."
            style={{
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              resize: 'vertical',
              flex: 1,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {jdText.length} characters • {jdText.split(/\s+/).filter(Boolean).length} words
            </span>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !jdText.trim()}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <Sparkles size={16} className={analyzing ? 'animate-spin' : ''} />
              {analyzing ? 'Parsing Requirements...' : 'Analyze JD Now'}
            </button>
          </div>
        </div>

        {/* Right: Analysis Results Viewer */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Extracted Requirements & Classification
            </span>

            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
            }}>
              <ShieldCheck size={13} /> Grounded Extraction
            </span>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {!analysisResult && !analyzing && !error && (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Layers size={36} color="#6b7280" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Click "Analyze JD Now" to parse the text into structured requirements.
              </p>
            </div>
          )}

          {analyzing && (
            <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 0.75rem auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Executing deterministic NLP extraction rules...
              </p>
            </div>
          )}

          {analysisResult && !analyzing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '520px', overflowY: 'auto' }}>
              {/* Required Skills */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>REQUIRED</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Mandatory Skills ({analysisResult.required_skills?.length || 0})
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {analysisResult.required_skills?.length > 0 ? (
                    analysisResult.required_skills.map((s, idx) => {
                      const hasSkill = userSkills.includes(s.toLowerCase());
                      return (
                        <span
                          key={idx}
                          style={{
                            background: hasSkill ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                            border: `1px solid ${hasSkill ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                            color: hasSkill ? '#6ee7b7' : 'var(--text-primary)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          {hasSkill && <Check size={11} />} {s}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>None identified</span>
                  )}
                </div>
              </div>

              {/* Preferred Skills */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>PREFERRED</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Bonus / Nice-to-Have Skills ({analysisResult.preferred_skills?.length || 0})
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {analysisResult.preferred_skills?.length > 0 ? (
                    analysisResult.preferred_skills.map((s, idx) => {
                      const hasSkill = userSkills.includes(s.toLowerCase());
                      return (
                        <span
                          key={idx}
                          style={{
                            background: hasSkill ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                            border: `1px solid ${hasSkill ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                            color: hasSkill ? '#6ee7b7' : 'var(--text-primary)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          {hasSkill && <Check size={11} />} {s}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>None identified</span>
                  )}
                </div>
              </div>

              {/* Inferred / Uncertain Skills */}
              {analysisResult.inferred_skills?.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>UNCERTAIN</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Skills in General Context ({analysisResult.inferred_skills.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {analysisResult.inferred_skills.map((s, idx) => (
                      <span key={idx} className="tag-chip" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education & Degree */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Education Requirements
                </div>
                {analysisResult.education?.length > 0 ? (
                  analysisResult.education.map((edu, i) => (
                    <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.3rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px', marginBottom: '0.25rem' }}>
                      • <strong style={{ color: 'var(--text-primary)' }}>{edu.degree}</strong> in {edu.field} ({edu.classification})
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No explicit degree requirements found.</span>
                )}
              </div>

              {/* Responsibilities */}
              {analysisResult.responsibilities?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Key Responsibilities ({analysisResult.responsibilities.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {analysisResult.responsibilities.map((resp, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.3rem 0.5rem', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                        • {resp}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
