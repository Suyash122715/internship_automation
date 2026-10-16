import React, { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import StatCard from './components/dashboard/StatCard';
import SystemHealthCard from './components/dashboard/SystemHealthCard';
import PipelineOverview from './components/dashboard/PipelineOverview';
import ActivityFeed from './components/dashboard/ActivityFeed';
import ProfilePage from './components/profile/ProfilePage';
import JobsPage from './components/jobs/JobsPage';
import MatchingPage from './components/matching/MatchingPage';
import MaterialsPage from './components/materials/MaterialsPage';
import ApplicationsPage from './components/automation/ApplicationsPage';
import ContactsPage from './components/contacts/ContactsPage';
import OutreachPage from './components/outreach/OutreachPage';
import TrackerPage from './components/tracker/TrackerPage';
import { fetchHealth } from './services/api';
import { 
  Briefcase, 
  Target, 
  FileEdit, 
  Send, 
  Mail, 
  MessageSquare, 
  CalendarCheck, 
  Trophy, 
  Info, 
  UserCheck, 
  Search, 
  Layers, 
  FileText, 
  ShieldCheck,
  Activity
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await fetchHealth();
      setHealthData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const stats = healthData?.stats || {
    jobs_found: 0,
    matching_jobs: 0,
    applications_prepared: 0,
    applications_submitted: 0,
    emails_sent: 0,
    responses: 0,
    interviews: 0,
    offers: 0,
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      health={healthData} 
      onRefresh={loadHealth}
      loading={loading}
    >
      {activeTab === 'dashboard' && (
        <div>
          {/* Welcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
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
                <span className="badge badge-success">Batch 10 Complete</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Final Integration, Security Hardened & Production Verified</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
                Internship Automation Hub
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Discover genuine opportunities, match profile compatibility, generate tailored materials, automate verified applications, discover recruiters, send personalized cold emails, and track all pipelines with real data.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('tracker')}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                <Activity size={16} /> Application Tracker
              </button>
              <button
                onClick={() => setActiveTab('outreach')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <Mail size={16} /> Cold Email Engine ({stats.emails_sent})
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <ShieldCheck size={16} /> Recruiter Contacts
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <Send size={16} /> Application Assistant ({stats.applications_submitted})
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <FileText size={16} /> Resumes & Letters ({stats.applications_prepared})
              </button>
              <button
                onClick={() => setActiveTab('matching')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <Layers size={16} /> JD & Matching
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <Search size={16} /> Job Discovery ({stats.jobs_found})
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <UserCheck size={16} /> Manage Profile
              </button>
            </div>
          </div>

          {/* System Health Card */}
          <SystemHealthCard health={healthData} />

          {/* Section 18: Dashboard Stat Cards Grid */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
                Pipeline Overview & Metrics (PRD Section 18)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Live Counters
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '1rem'
            }}>
              <StatCard
                title="Jobs Found"
                value={stats.jobs_found}
                icon={Briefcase}
                badgeText="Discovery"
                badgeColor="info"
                description="Scraped from active portals"
              />
              <StatCard
                title="Matching Jobs"
                value={stats.matching_jobs}
                icon={Target}
                badgeText="Score ≥ 70%"
                badgeColor="purple"
                description="Compatible with your profile"
              />
              <StatCard
                title="Applications Prepared"
                value={stats.applications_prepared}
                icon={FileEdit}
                badgeText="Tailored"
                badgeColor="warning"
                description="Resumes & cover letters ready"
              />
              <StatCard
                title="Applications Submitted"
                value={stats.applications_submitted}
                icon={Send}
                badgeText="Dispatched"
                badgeColor="success"
                description="Submitted with approval"
              />
              <StatCard
                title="Emails Sent"
                value={stats.emails_sent}
                icon={Mail}
                badgeText="Outreach"
                badgeColor="info"
                description="Approved cold emails"
              />
              <StatCard
                title="Responses"
                value={stats.responses}
                icon={MessageSquare}
                badgeText="Replies"
                badgeColor="purple"
                description="Recruiter inbound responses"
              />
              <StatCard
                title="Interviews"
                value={stats.interviews}
                icon={CalendarCheck}
                badgeText="Progressing"
                badgeColor="warning"
                description="Interview rounds scheduled"
              />
              <StatCard
                title="Offers"
                value={stats.offers}
                icon={Trophy}
                badgeText="Goal"
                badgeColor="success"
                description="Internship offers received"
              />
            </div>
          </div>

          {/* Pipeline Lifecycle Overview */}
          <PipelineOverview />

          {/* Activity Feed */}
          <ActivityFeed health={healthData} />
        </div>
      )}

      {activeTab === 'profile' && (
        <ProfilePage />
      )}

      {activeTab === 'jobs' && (
        <JobsPage />
      )}

      {activeTab === 'matching' && (
        <MatchingPage />
      )}

      {activeTab === 'materials' && (
        <MaterialsPage />
      )}

      {activeTab === 'applications' && (
        <ApplicationsPage />
      )}

      {activeTab === 'contacts' && (
        <ContactsPage />
      )}

      {activeTab === 'outreach' && (
        <OutreachPage />
      )}

      {activeTab === 'tracker' && (
        <TrackerPage />
      )}

      {activeTab !== 'dashboard' && activeTab !== 'profile' && activeTab !== 'jobs' && activeTab !== 'matching' && activeTab !== 'materials' && activeTab !== 'applications' && activeTab !== 'contacts' && activeTab !== 'outreach' && activeTab !== 'tracker' && (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Info size={28} color="#818cf8" />
          </div>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Module Scheduled for Subsequent Batch
          </h2>
          <p style={{ maxWidth: '540px', margin: '0 auto 1.5rem auto', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            In strict accordance with AI Rule #6 and the PRD Batch Development Plan, this module will be implemented in its designated batch.
          </p>
          <button onClick={() => setActiveTab('dashboard')} className="btn btn-primary">
            Return to Dashboard Shell
          </button>
        </div>
      )}
    </Layout>
  );
}
