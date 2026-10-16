Internship Automation Agent — Master PRD
1. Product Name

Internship Agent

A locally running personal internship automation platform that helps a user discover internships, evaluate them against their profile, prepare tailored application materials, automate supported application forms, discover relevant HR/recruiter contacts, send personalized cold emails, and track the entire outreach/application pipeline.

2. Core Objective

The system should reduce the repetitive work involved in applying to internships.

The user should be able to:

Maintain one master profile.
Upload a master resume.
Define internship preferences.
Discover relevant internships.
Analyze job descriptions.
Calculate compatibility with the user's profile.
Generate a tailored resume.
Generate a tailored cover letter.
Prepare/fill supported application forms.
Review applications before submission.
Find relevant recruiter/HR contact information where legally and technically appropriate.
Generate personalized cold emails.
Send approved emails through the user's email account.
Track applications and outreach.

The application should run locally on the user's machine.

3. Core Principles
3.1 Local-first

The application should primarily run locally.

3.2 Human control

The system should not blindly submit applications or send large batches of emails without user control.

3.3 Truthfulness

The AI must never invent:

skills
projects
experience
internships
companies
recruiter identities
recruiter email addresses
job requirements
application results
qualifications
achievements

If information is unavailable, the system must explicitly say so.

3.4 PRD is the source of truth

Every implementation agent must follow this PRD.

If a requested implementation conflicts with the PRD, the agent must stop and ask for clarification rather than silently changing the architecture or requirements.

3.5 No unnecessary complexity

Do not introduce:

microservices
Kubernetes
unnecessary vector databases
unnecessary message queues
unnecessary cloud infrastructure

unless explicitly required by a later PRD update.

4. Target Architecture
                    React Frontend
                         │
                         ▼
                    FastAPI API
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
   Job Engine       Application       Outreach Engine
        │             Engine               │
        ▼                ▼                 ▼
   Job Sources      Playwright          Contacts
        │                │                 │
        └────────────────┼─────────────────┘
                         ▼
                     AI Layer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       JD Parser     Resume AI      Email AI
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                      SQLite

Initial technology:

Frontend: React
Backend: FastAPI
Database: SQLite
Browser automation: Playwright
AI: configurable LLM provider
Email: Gmail/API or supported SMTP mechanism
Document processing: Python libraries
Local execution: native/local development initially

PostgreSQL can be introduced later if actually needed.

5. Major Modules
Module A — User Profile

Stores:

Name
Email
Phone
College
Degree
Branch
Graduation year
CGPA
Skills
Projects
Experience
Certifications
GitHub
LinkedIn
Portfolio
Resume
Preferences
6. Internship Preferences

User can define:

Target roles
Preferred locations
Remote/hybrid/on-site
Skills
Minimum match score
Internship duration
Stipend preference
Company preferences
Excluded roles
Excluded companies
7. Internship Discovery

The system should discover internship opportunities from supported sources.

Each job should contain:

Job
├── company
├── title
├── location
├── description
├── requirements
├── skills
├── application_url
├── source
├── date_found
└── status

Duplicate jobs should be detected.

The system must not fabricate jobs.

If a source cannot be accessed, the system must report that rather than generating fake results.

8. Job Description Analyzer

For each job:

JD
 ↓
Extract
 ├── required skills
 ├── preferred skills
 ├── education
 ├── experience
 ├── location
 ├── responsibilities
 └── other requirements

The analyzer should distinguish:

Required

from

Preferred

and

Inferred/uncertain

requirements.

9. Matching Engine

The system calculates compatibility between:

User Profile
       +
Job
       ↓
Match Analysis

Example:

Overall Match: 84%

Skills:          90%
Education:       100%
Experience:       70%
Location:        100%
Role relevance:   85%

The exact weighting should be configurable.

The score must be explainable.

The system must not claim that a user is qualified if the evidence does not support that conclusion.

10. Resume Tailoring

The user maintains a master resume.

For each job, the system can create a tailored version.

Rules:

Never invent experience.
Never invent skills.
Never fabricate metrics.
Never change factual information.
Only reorder, emphasize, shorten, or rewrite truthful information.
Clearly identify generated modifications.
11. Cover Letter Generation

Generate a cover letter using:

User profile
+
Job description
+
Company information

Rules:

No fabricated company facts.
No fabricated user experience.
No fake achievements.
No false claims of previous interaction with recruiters.
12. Application Automation

Use Playwright for supported web application workflows.

The system should:

Open application URL.
Detect fields.
Map known profile information.
Fill fields.
Upload appropriate resume.
Upload cover letter where applicable.
Detect questions.
Ask the user when uncertain.
Show review screen.
Submit only after user approval.

CAPTCHAs and anti-bot mechanisms must not be bypassed.

If automation cannot safely determine what to do, it should stop and request user intervention.

13. HR / Recruiter Outreach

The system should maintain:

Contact
├── name
├── company
├── role
├── email
├── LinkedIn
├── source
└── confidence/status

The system should distinguish:

verified contact
publicly listed contact
inferred/unverified contact

It must never fabricate an email address.

14. Cold Email Generator

Generate personalized emails based on:

Company
+
Role
+
Recruiter information
+
User profile
+
Relevant project/skill

Example workflow:

Select Company
      ↓
Select Contact
      ↓
Select Internship
      ↓
Generate Email
      ↓
User Review
      ↓
Approve
      ↓
Send

The user must retain control over sending.

15. Email Sending

The system should support connecting the user's email account.

Features:

Send individual email
Queue emails
Batch approved emails
Draft mode
Sent history
Failed emails
Retry

The system should use reasonable rate limits and avoid spam-like behavior.

16. Application Tracker

Every application gets a status.

DISCOVERED
    ↓
ANALYZED
    ↓
PREPARED
    ↓
READY
    ↓
APPLIED
    ↓
ASSESSMENT
    ↓
INTERVIEW
    ↓
OFFER

Alternative terminal states:

REJECTED
WITHDRAWN
EXPIRED
17. Outreach Tracker
CONTACT FOUND
      ↓
EMAIL DRAFTED
      ↓
APPROVED
      ↓
SENT
      ↓
REPLIED

Possible:

NO RESPONSE
FOLLOW-UP
BOUNCED
18. Dashboard

Dashboard should display:

Jobs Found
Matching Jobs
Applications Prepared
Applications Submitted
Emails Sent
Responses
Interviews
Offers

and recent activity.

19. Security

Sensitive information must be handled carefully.

Never log:

email passwords
API keys
OAuth tokens
private credentials

Credentials should be stored securely and never committed to Git.

20. AI Safety / Reliability Rules

This is extremely important.

Every AI component must follow:

NEVER HALLUCINATE

If information isn't available:

UNKNOWN

rather than guessing.

NEVER INVENT

The AI must never create:

job postings
recruiter names
email addresses
skills
projects
achievements
employment
company facts
application statuses
SOURCE-GROUNDED GENERATION

AI output must be based only on supplied:

user profile
resume
JD
verified job data
verified company data
verified contact data
NO PRD DEVIATION

Implementation agents must not:

redesign architecture without authorization
add unrelated features
remove required features
change database design arbitrarily
introduce new frameworks unnecessarily
rewrite existing modules without reason
21. Batch Development Plan

We're going to build this in 10 batches.

BATCH 1  → Project Foundation
BATCH 2  → User Profile + Resume
BATCH 3  → Job Discovery
BATCH 4  → JD Analysis + Matching
BATCH 5  → Resume + Cover Letter
BATCH 6  → Application Automation
BATCH 7  → HR/Recruiter Discovery
BATCH 8  → Cold Email Engine
BATCH 9  → Tracking + Dashboard
BATCH 10 → Integration + Testing + Hardening