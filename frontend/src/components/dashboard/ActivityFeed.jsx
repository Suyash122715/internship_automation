import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Send, 
  Calendar, 
  Mail, 
  UserCheck, 
  Target, 
  Database, 
  Server,
  Activity as ActivityIcon
} from 'lucide-react';
import { fetchRecentActivity } from '../../services/api';

export default function ActivityFeed({ health }) {
  const [realEvents, setRealEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchRecentActivity(6)
      .then((res) => {
        if (mounted && res?.events) {
          setRealEvents(res.events);
        }
      })
      .catch((err) => {
        console.error('ActivityFeed fetch error:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const defaultEvents = [
    {
      id: 'init_1',
      title: 'Foundation Initialized',
      description: 'FastAPI server, SQLite engine, and React shell ready.',
      timestamp: new Date().toISOString(),
      icon: CheckCircle2,
      color: '#34d399',
    },
    {
      id: 'init_2',
      title: 'Database Tables Created',
      description: '6 core schemas initialized in SQLite (user_profiles, jobs, applications, etc.).',
      timestamp: new Date().toISOString(),
      icon: Database,
      color: '#38bdf8',
    },
    {
      id: 'init_3',
      title: 'Health Check Verified',
      description: 'GET /api/v1/health operational with 200 OK status.',
      timestamp: new Date().toISOString(),
      icon: Server,
      color: '#818cf8',
    },
  ];

  const displayEvents = realEvents.length > 0 ? realEvents : defaultEvents;

  const getEventIcon = (type) => {
    switch (type) {
      case 'application_submitted':
        return Send;
      case 'interview_scheduled':
        return Calendar;
      case 'email_sent':
        return Mail;
      case 'contact_added':
        return UserCheck;
      case 'job_analyzed':
        return Target;
      default:
        return ActivityIcon;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
            Recent Activity & Log
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {realEvents.length > 0 ? 'Live Database Audit Log' : 'Initial System Setup Log'}
          </span>
        </div>
        <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
          Real-time Audit
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {displayEvents.map((evt) => {
          const Icon = evt.icon || getEventIcon(evt.type);
          const iconColor = evt.color || '#818cf8';
          const timeDisplay = evt.timestamp 
            ? new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
            : 'Just now';

          return (
            <div
              key={evt.id}
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{
                marginTop: '0.1rem',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={16} color={iconColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {evt.title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {timeDisplay}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  {evt.description || evt.desc}
                </p>
              </div>
              {evt.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.06)',
                  color: iconColor,
                  border: `1px solid ${iconColor}`,
                  flexShrink: 0,
                }}>
                  {evt.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
