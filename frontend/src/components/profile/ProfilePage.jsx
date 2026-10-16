import React, { useState, useEffect } from 'react';
import { 
  User, 
  GraduationCap, 
  Award, 
  Briefcase, 
  CheckCircle2, 
  Link as LinkIcon, 
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';
import { getProfile, updateProfile } from '../../services/api';
import ProfileOverviewCard from './ProfileOverviewCard';
import PersonalInfoSection from './PersonalInfoSection';
import EducationSection from './EducationSection';
import SkillsSection from './SkillsSection';
import ProjectsSection from './ProjectsSection';
import ExperienceSection from './ExperienceSection';
import LinksAndCertsSection from './LinksAndCertsSection';
import MasterResumeManager from './MasterResumeManager';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('resume');
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage({ text: '', type: '' });
      const updated = await updateProfile(formData);
      setProfile(updated);
      setFormData(updated);
      setMessage({ text: 'Profile changes saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setMessage({ text: err.message || 'Failed to save profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'resume', label: 'Master Resume', icon: FileText },
    { id: 'personal', label: 'Personal & Contact', icon: User },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Award },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'experience', label: 'Experience', icon: CheckCircle2 },
    { id: 'links', label: 'Links & Certs', icon: LinkIcon },
  ];

  if (loading && !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
        Loading authoritative user profile...
      </div>
    );
  }

  return (
    <div>
      {/* Overview Banner */}
      <ProfileOverviewCard profile={profile} onSelectTab={setActiveTab} />

      {/* Global Status Message */}
      {message.text && (
        <div style={{
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-header">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'resume' && (
        <MasterResumeManager profile={profile} onProfileUpdated={loadProfile} />
      )}

      {activeTab === 'personal' && (
        <PersonalInfoSection
          formData={formData}
          onChange={handleInputChange}
          onSave={handleSaveProfile}
          saving={saving}
        />
      )}

      {activeTab === 'education' && (
        <EducationSection
          formData={formData}
          onChange={handleInputChange}
          onSave={handleSaveProfile}
          saving={saving}
          setFormData={setFormData}
        />
      )}

      {activeTab === 'skills' && (
        <SkillsSection
          formData={formData}
          onSave={handleSaveProfile}
          saving={saving}
          setFormData={setFormData}
        />
      )}

      {activeTab === 'projects' && (
        <ProjectsSection
          formData={formData}
          onSave={handleSaveProfile}
          saving={saving}
          setFormData={setFormData}
        />
      )}

      {activeTab === 'experience' && (
        <ExperienceSection
          formData={formData}
          onSave={handleSaveProfile}
          saving={saving}
          setFormData={setFormData}
        />
      )}

      {activeTab === 'links' && (
        <LinksAndCertsSection
          formData={formData}
          onChange={handleInputChange}
          onSave={handleSaveProfile}
          saving={saving}
          setFormData={setFormData}
        />
      )}
    </div>
  );
}
