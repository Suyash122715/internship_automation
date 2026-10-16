/**
 * API Service for communicating with FastAPI Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch health check:', error);
    return {
      status: 'error',
      app_name: 'Internship Automation Agent',
      app_env: 'unknown',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        database_url: 'unknown',
        tables: [],
      },
      stats: {
        jobs_found: 0,
        matching_jobs: 0,
        applications_prepared: 0,
        applications_submitted: 0,
        emails_sent: 0,
        responses: 0,
        interviews: 0,
        offers: 0,
      },
      error: error.message,
    };
  }
}

export async function getProfile() {
  const response = await fetch(`${API_BASE_URL}/api/v1/profile`);
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateProfile(profileData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.statusText}`);
  }
  return await response.json();
}

export async function uploadResumeFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/v1/profile/resume/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to upload resume: ${response.statusText}`);
  }
  return await response.json();
}

export function getResumeDownloadUrl() {
  return `${API_BASE_URL}/api/v1/profile/resume/download`;
}

export async function deleteResumeFile() {
  const response = await fetch(`${API_BASE_URL}/api/v1/profile/resume`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete resume: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateResumeTextContent(text) {
  const response = await fetch(`${API_BASE_URL}/api/v1/profile/resume/text`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update resume text: ${response.statusText}`);
  }
  return await response.json();
}

/* ==========================================================================
   BATCH 3: JOB DISCOVERY & MANAGEMENT API
   ========================================================================== */

export async function fetchJobs(params = {}) {
  const query = new URLSearchParams();
  if (params.q) query.append('q', params.q);
  if (params.company) query.append('company', params.company);
  if (params.location) query.append('location', params.location);
  if (params.source) query.append('source', params.source);
  if (params.status) query.append('status', params.status);
  if (params.workplace_type) query.append('workplace_type', params.workplace_type);
  if (params.is_internship_only !== undefined) query.append('is_internship_only', params.is_internship_only);
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.sort_order) query.append('sort_order', params.sort_order);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const response = await fetch(`${API_BASE_URL}/api/v1/jobs?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchJobById(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch job ${jobId}: ${response.statusText}`);
  }
  return await response.json();
}

export async function createJob(jobData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create job: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateJob(jobId, jobData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update job: ${response.statusText}`);
  }
  return await response.json();
}

export async function deleteJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete job: ${response.statusText}`);
  }
  return await response.json();
}

export async function discoverJobs(payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: payload.query || 'intern',
      sources: payload.sources || ['remoteok', 'jobicy', 'arbeitnow'],
      filter_internships_only: payload.filter_internships_only !== false,
      limit_per_source: payload.limit_per_source || 30,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to run discovery: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchSourceStatus() {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/sources/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch source statuses: ${response.statusText}`);
  }
  return await response.json();
}

export async function importGreenhouseJobs(boardToken, filterQuery = '') {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/import/greenhouse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board_token: boardToken,
      filter_query: filterQuery || null,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to import from Greenhouse: ${response.statusText}`);
  }
  return await response.json();
}

export async function importLeverJobs(company, filterQuery = '') {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/import/lever`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company,
      filter_query: filterQuery || null,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to import from Lever: ${response.statusText}`);
  }
  return await response.json();
}

export async function bulkImportJobs(jobs) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/import/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobs }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to bulk import jobs: ${response.statusText}`);
  }
  return await response.json();
}

export async function batchUpdateJobStatus(jobIds, newStatus) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/batch/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_ids: jobIds,
      action: 'status_update',
      status: newStatus,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update jobs status: ${response.statusText}`);
  }
  return await response.json();
}

export async function batchDeleteJobs(jobIds) {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/batch/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_ids: jobIds,
      action: 'delete',
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to batch delete jobs: ${response.statusText}`);
  }
  return await response.json();
}

/* ==========================================================================
   BATCH 4: JOB DESCRIPTION ANALYSIS & PROFILE MATCHING API
   ========================================================================== */

export async function analyzeJDText(description) {
  const response = await fetch(`${API_BASE_URL}/api/v1/matching/analyze-jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to analyze job description: ${response.statusText}`);
  }
  return await response.json();
}

export async function analyzeStoredJob(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/matching/${jobId}/analyze`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to analyze job: ${response.statusText}`);
  }
  return await response.json();
}

export async function matchJob(jobId, customWeights = null) {
  const response = await fetch(`${API_BASE_URL}/api/v1/matching/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, custom_weights: customWeights }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to match job: ${response.statusText}`);
  }
  return await response.json();
}

export async function batchMatchJobs(jobIds, customWeights = null) {
  const response = await fetch(`${API_BASE_URL}/api/v1/matching/match/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_ids: jobIds, custom_weights: customWeights }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to batch match jobs: ${response.statusText}`);
  }
  return await response.json();
}

/* ==========================================================================
   BATCH 5: APPLICATION MATERIALS (TAILORED RESUME & COVER LETTER) API
   ========================================================================== */

export async function fetchJobMaterials(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/materials/${jobId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch materials: ${response.statusText}`);
  }
  return await response.json();
}

export async function generateAllMaterials(jobId, submissionNotes = null) {
  const response = await fetch(`${API_BASE_URL}/api/v1/materials/generate-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      submission_notes: submissionNotes,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to generate materials: ${response.statusText}`);
  }
  return await response.json();
}

export async function tailorResume(jobId, saveToDb = true) {
  const response = await fetch(`${API_BASE_URL}/api/v1/materials/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      save_to_db: saveToDb,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to tailor resume: ${response.statusText}`);
  }
  return await response.json();
}

export async function generateCoverLetter(jobId, saveToDb = true) {
  const response = await fetch(`${API_BASE_URL}/api/v1/materials/cover-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      save_to_db: saveToDb,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to generate cover letter: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateJobMaterials(jobId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/materials/${jobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update materials: ${response.statusText}`);
  }
  return await response.json();
}

export function getMaterialDownloadUrl(jobId, docType) {
  return `${API_BASE_URL}/api/v1/materials/${jobId}/download/${docType}`;
}

/* ==========================================================================
   BATCH 6: APPLICATION AUTOMATION & ASSISTANT (PLAYWRIGHT) API
   ========================================================================== */

export async function detectApplicationFields(jobId, applicationUrl = null, headless = true) {
  const response = await fetch(`${API_BASE_URL}/api/v1/automation/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      application_url: applicationUrl,
      headless,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to detect fields: ${response.statusText}`);
  }
  return await response.json();
}

export async function fillApplicationForm(jobId, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/automation/fill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      application_url: payload.application_url || null,
      use_tailored_resume: payload.use_tailored_resume !== false,
      use_cover_letter: payload.use_cover_letter !== false,
      custom_answers: payload.custom_answers || {},
      headless: payload.headless !== false,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fill form: ${response.statusText}`);
  }
  return await response.json();
}

export async function submitApplication(jobId, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/automation/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      user_approved: payload.user_approved === true,
      application_url: payload.application_url || null,
      custom_answers: payload.custom_answers || {},
      headless: payload.headless !== false,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to submit application: ${response.statusText}`);
  }
  return await response.json();
}

/* ==========================================================================
   BATCH 7: HR / RECRUITER CONTACT DISCOVERY & MANAGEMENT API
   ========================================================================== */

export async function fetchContacts(params = {}) {
  const query = new URLSearchParams();
  if (params.q) query.append('q', params.q);
  if (params.company) query.append('company', params.company);
  if (params.verification_status) query.append('verification_status', params.verification_status);
  if (params.outreach_status) query.append('outreach_status', params.outreach_status);
  if (params.job_id !== undefined) query.append('job_id', params.job_id);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const response = await fetch(`${API_BASE_URL}/api/v1/contacts?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchContactById(contactId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/contacts/${contactId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch contact ${contactId}: ${response.statusText}`);
  }
  return await response.json();
}

export async function createContact(contactData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contactData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create contact: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateContact(contactId, contactData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/contacts/${contactId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contactData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update contact: ${response.statusText}`);
  }
  return await response.json();
}

export async function deleteContact(contactId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/contacts/${contactId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete contact: ${response.statusText}`);
  }
  return await response.json();
}

export async function inferEmailPatterns(contactId, companyDomain) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/contacts/${contactId}/infer-email?company_domain=${encodeURIComponent(companyDomain)}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to infer email patterns: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchContactStats() {
  const response = await fetch(`${API_BASE_URL}/api/v1/contacts/stats/summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch contact stats: ${response.statusText}`);
  }
  return await response.json();
}

/* ==========================================================================
   BATCH 8: COLD EMAIL OUTREACH ENGINE API
   ========================================================================== */

export async function fetchEmailTemplates() {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/templates`);
  if (!response.ok) {
    throw new Error(`Failed to fetch email templates: ${response.statusText}`);
  }
  return await response.json();
}

export async function generateColdEmail(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to generate email: ${response.statusText}`);
  }
  return await response.json();
}

export async function createEmailDraft(payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to save email draft: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchOutreachEmails(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.contact_id !== undefined) query.append('contact_id', params.contact_id);
  if (params.job_id !== undefined) query.append('job_id', params.job_id);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch outreach emails: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchOutreachEmailById(emailId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch email ${emailId}: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateOutreachEmail(emailId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update email: ${response.statusText}`);
  }
  return await response.json();
}

export async function deleteOutreachEmail(emailId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete email: ${response.statusText}`);
  }
  return true;
}

export async function approveOutreachEmail(emailId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}/approve`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to approve email: ${response.statusText}`);
  }
  return await response.json();
}

export async function sendOutreachEmail(emailId, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allow_inferred: options.allow_inferred === true,
      force_approve: options.force_approve === true,
      simulate: options.simulate !== undefined ? options.simulate : undefined,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to send email: ${response.statusText}`);
  }
  return await response.json();
}

export async function queueOutreachEmail(emailId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}/queue`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to queue email: ${response.statusText}`);
  }
  return await response.json();
}

export async function processOutreachQueue(params = {}) {
  const query = new URLSearchParams();
  if (params.max_batch) query.append('max_batch', params.max_batch);
  if (params.allow_inferred) query.append('allow_inferred', 'true');

  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/queue/process?${query.toString()}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to process queue: ${response.statusText}`);
  }
  return await response.json();
}

export async function retryOutreachEmail(emailId, options = {}) {
  const query = options.allow_inferred ? '?allow_inferred=true' : '';
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/emails/${emailId}/retry${query}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to retry email: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchOutreachStats() {
  const response = await fetch(`${API_BASE_URL}/api/v1/outreach/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch outreach stats: ${response.statusText}`);
  }
  return await response.json();
}

// ── Batch 9: Application & Outreach Tracker API ──────────────────────────────

export async function fetchDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/api/v1/tracker/dashboard`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchTrackerApplications(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.company) query.append('company', params.company);
  if (params.search) query.append('search', params.search);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const response = await fetch(`${API_BASE_URL}/api/v1/tracker/applications?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tracked applications: ${response.statusText}`);
  }
  return await response.json();
}

export async function updateApplicationTrackerStatus(applicationId, data) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tracker/applications/${applicationId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update status: ${response.statusText}`);
  }
  return await response.json();
}

export async function fetchRecentActivity(limit = 25) {
  const response = await fetch(`${API_BASE_URL}/api/v1/tracker/activity?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recent activity: ${response.statusText}`);
  }
  return await response.json();
}
