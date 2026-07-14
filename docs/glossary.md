# Glossary — Job For Sure

> **Purpose**: Single source of truth for every term, feature, button, flow, and entity in the app. When a user or AI agent says "the ATS thing" or "tailored resume", this doc defines what it means, where it lives in code, and which flow it belongs to.
>
> **Maintained**: Manually at task boundaries. Update when features change.

---

## Table of Contents

1. [Entities (Database Tables)](#1-entities-database-tables)
2. [Pages & Routes](#2-pages--routes)
3. [Sidebar Navigation](#3-sidebar-navigation)
4. [Resume Detail — Tabs & Buttons](#4-resume-detail--tabs--buttons)
5. [Chat — Career Coach](#5-chat--career-coach)
6. [Job Search Panel](#6-job-search-panel)
7. [ATS Optimizer](#7-ats-optimizer)
8. [Interview Practice](#8-interview-practice)
9. [Cover Letter](#9-cover-letter)
10. [Job Tracker (Applications)](#10-job-tracker-applications)
11. [Upload & Resume Creation](#11-upload--resume-creation)
12. [Templates](#12-templates)
13. [API Routes](#13-api-routes)
14. [Domain Terms](#14-domain-terms)
15. [Infrastructure Terms](#15-infrastructure-terms)

---

## 1. Entities (Database Tables)

All defined in `app/lib/schema.ts`. Migration files in `drizzle/` (never edit manually).

| Term | Table | Meaning | Used By |
|------|-------|---------|---------|
| **User** | `user` | Authenticated user. Fields: name, email, emailVerified, image. | Every feature. Managed by Better Auth. |
| **Session** | `session` | Better Auth session (cookie-based). Fields: token, expiresAt, ipAddress, userAgent. | `proxy.ts` (locale redirect), `AuthGuard`. |
| **Account** | `account` | OAuth provider link (e.g., Google). Fields: providerId, accessToken, refreshToken. | Better Auth Google sign-in. |
| **Verification** | `verification` | Email verification / password reset token. Fields: identifier, value, expiresAt. | Signup, password reset flows. |
| **Resume** | `resumes` | A user's base resume. `data` is a JSONB blob matching the `Resume` type. `isBase` marks non-tailored originals. Soft-deleted via `deletedAt`. | Resume Editor, Job Search, ATS, Cover Letter, Interview. |
| **Tailored Resume** | `tailored_resumes` | A resume variant optimized for a specific job. Links to `baseResumeId`, stores `jobUrl` + `jobData` (scraped JD). | "AI Optimize" button, "Tailor for this job" flow. |
| **Application** | `applications` | A tracked job in the pipeline. Fields: company, jobTitle, status (`bookmarked` → `applied` → `interviewing` → `offers`), tailoredResumeId, notes, appliedAt. | Job Tracker board. |
| **User Preferences** | `user_preferences` | Notification settings. Fields: emailNotifications, weeklyDigest, marketingEmails. | Settings page. |
| **Applications Data** | `applications_data` | JSONB backup of the full Kanban board state (for board persistence). | `useAppStore()` hydration. |
| **Interview Session** | `interview_sessions` | A completed mock interview. Fields: company, role, type (`behavioral`/`technical`/`mixed`), difficulty (`entry`/`mid`/`senior`), score, exchanges (JSON array of Q&A pairs). | Interview Practice page. |
| **Cover Letter** | `cover_letters` | Generated cover letter. Fields: resumeId, company, role, content (text), jdText (job description used). Soft-deleted via `deletedAt`. | Cover Letter tab + standalone page. |

### Entity Relationships

```
User ──1:N──► Resumes
  │             │
  │             ├── (isBase=true) ── base for tailoring
  │             │
  │             └──1:N──► TailoredResumes
  │                          │
  │                          └── baseResumeId → Resumes.id
  │
  ├──1:N──► Applications ──► tailoredResumeId → TailoredResumes.id
  ├──1:N──► InterviewSessions ──► resumeId → Resumes.id
  ├──1:N──► CoverLetters ──► resumeId → Resumes.id
  └──1:1──► UserPreferences
```

---

## 2. Pages & Routes

All app pages live under `app/[locale]/(app)/`. Locale prefix: `/en` or `/th`.

| Page | Route | What It Does | Sidebar Label | Component / Layout |
|------|-------|--------------|---------------|--------------------|
| **Dashboard** | `/dashboard` | Overview: resumes count, avg score, application pipeline summary, recent interviews, cover letters. Shortcut buttons to key actions. | _(not in sidebar)_ | `dashboard/page.tsx` |
| **Career Coach (Chat)** | `/chat` | AI chat with two modes: Coach (advice, job matching) and Build (conversational resume creation). Entry point for the whole app. | **Career Coach** | `chat/page.tsx` |
| **Resume Detail** | `/resume/[id]` | The resume workspace. 4 tabs: Find Jobs, View Resume, Resume Editor, Cover Letter. | _(via resume list in sidebar)_ | `resume/[id]/page.tsx` → `ResumeDetail` |
| **ATS Optimizer** | `/ats` | Paste a JD, pick a resume, get a match score + keyword analysis. | **ATS Optimizer** | `ats/page.tsx` |
| **Cover Letter** | `/cover-letter` | Standalone cover letter generator (separate from the resume tab version). | **Cover Letter** | `cover-letter/page.tsx` |
| **Interview Practice** | `/interview` | Mock interview with AI. Configure company, role, type, difficulty. Voice input supported. | **Interview Practice** | `interview/page.tsx` |
| **Job Tracker** | `/applications` | Kanban board of bookmarked/applied/interviewing/offer jobs. Drag-and-drop between columns. | **Job Tracker** | `applications/page.tsx` |
| **Settings** | `/settings` | Account settings: email, password, preferences (notifications), language. | **Settings** | `settings/page.tsx` |
| **Admin** | `/admin` | Admin-only panel. Hidden unless `isAdmin` returns true from `/api/auth/is-admin`. | **Admin** (conditional) | `admin/page.tsx` |

---

## 3. Sidebar Navigation

Defined in `app/components/layout/sidebar.tsx`. Sections:

```
┌─ HOME ──────────────────────────────┐
│  Career Coach          → /chat      │
└──────────────────────────────────────┘
┌─ MY RESUMES ────────────────────────┐
│  [Resume 1] (score%)  → /resume/[id]│
│  [Resume 2] (score%)  → /resume/[id]│
│  + New Resume          → UploadModal │
└──────────────────────────────────────┘
┌─ JOBS ──────────────────────────────┐
│  Job Tracker (badge)  → /applications│
└──────────────────────────────────────┘
┌─ PRACTICE ──────────────────────────┐
│  Interview Practice   → /interview  │
└──────────────────────────────────────┘
┌─ TOOLS ─────────────────────────────┐
│  ATS Optimizer        → /ats        │
│  Cover Letter         → /cover-letter│
└──────────────────────────────────────┘
┌─ ACCOUNT ───────────────────────────┐
│  Settings             → /settings   │
│  Admin (if admin)     → /admin      │
└──────────────────────────────────────┘
```

| Element | Action | Store / Component |
|---------|--------|-------------------|
| **Resume list item** | Click → sets `activeResumeId` + navigates to `/resume/[id]`. Shows score badge. Trash icon (hover) → delete confirm. | `useAppStore().setActiveResumeId`, `deleteResume` |
| **+ New Resume** | Opens **UploadModal** (file upload or Build with AI). | `UploadModal` |
| **Job Tracker badge** | Shows total count across all 4 pipeline columns. Red dot when collapsed. | `applications.bookmark + applied + interviewing + offers` length |
| **Collapse toggle** | Collapses sidebar to icon-only. Auto-collapses on mobile (<768px). | `useAppStore().toggleSidebar` |

---

## 4. Resume Detail — Tabs & Buttons

Component: `app/components/resume/resume-detail.tsx`

### 4.1 Tab Bar

| Tab | Internal ID | What It Shows |
|-----|-------------|---------------|
| **Find Jobs** | `jobs` | `JobSearchPanel` — search real job boards, see scored results |
| **View Resume** | `view` | PDF preview (`ResumePreview`), template selector gallery, export buttons |
| **Resume Editor** | `editor` | Form-based editor (left) + AI Co-Pilot sidebar (right) |
| **Cover Letter** | `cover-letter` | `CoverLetterEditor` for this specific resume |

### 4.2 Header Actions

| Button | What It Does | API / Store |
|--------|-------------|-------------|
| **Back** | Returns to `/chat` | `router.push('/chat')` |
| **Delete** | Opens confirm dialog → soft-deletes resume → returns to chat | `deleteResume(id)` → `DELETE /api/resumes/[id]` |
| **Match Score badge** | Shows current resume's ATS match percentage (display only) | `resume.score` |

### 4.3 View Resume Tab

| Button | What It Does | API / Store |
|--------|-------------|-------------|
| **Template selector** | Opens gallery → pick template → saves to resume | `updateResume(id, { template })` |
| **Export PDF** | Opens `/api/export/pdf?id=[id]` in new tab → downloads A4 PDF | `GET /api/export/pdf` |
| **Export DOCX** | Future feature (shows "coming soon" toast) | — |

### 4.4 Resume Editor Tab

| Button | What It Does | API / Store |
|--------|-------------|-------------|
| **Save Changes** | Persists all form edits to DB | `updateResume(id, data)` → `PATCH /api/resumes/[id]` |
| **Save as New** | Clones resume with new ID + "(Copy)" suffix | `addResume(clone)` → `POST /api/resumes` |
| **AI Optimize** | Sends resume + target job data to AI → returns optimized summary, skills, experience bullets. Applies changes in-place. Shows "Optimizing..." while loading. | `POST /api/ai/tailor` |
| **Add Section** | Opens picker to add: Education, Projects, Certifications, Languages, Custom Sections | Local state → saves on **Save Changes** |
| **Section suggestion banner** | AI-driven banner suggesting missing sections (e.g., "Add Certifications?") based on detected role | Internal analysis, dismissible |
| **Drag handle (section)** | Reorder sections by drag-and-drop (DnD Context) | Local state reordering |

### 4.5 Resume Sections (Form Fields)

Defined in `app/types/resume.ts` → `Resume` interface:

| Section | Fields | Type |
|---------|--------|------|
| **Header** | Resume Name, Full Name (persona), Email, Phone, Location, GitHub/Portfolio, Headline/Target Role | Always shown |
| **Professional Summary** | Free-text summary | Textarea |
| **Skills** | Tag input (type + Enter) | `string[]` |
| **Work Experience** | Company, Role, Dates, Highlights (one per line) | `ResumeExperience[]` |
| **Education** | Institution, Degree, Field of Study, Dates | `ResumeEducation[]` |
| **Projects** | Name, Description, Tech Stack (tags), Link | `ResumeProject[]` |
| **Certifications** | Name, Issuer, Date | `ResumeCertification[]` |
| **Languages** | Language, Proficiency | `ResumeLanguage[]` |
| **Custom Sections** | Title + type (`bullets` / `dated-items` / `grid`) | `ResumeCustomSection[]` |

### 4.6 AI Co-Pilot (Editor Sidebar)

Component: `app/components/resume/resume-copilot.tsx`

| Feature | What It Does |
|---------|-------------|
| **Chat interface** | Side panel chat with the AI. Knows the current resume context. |
| **Rewrite** | "Improve this bullet" — rewrites selected content |
| **Add keywords** | Suggests missing keywords based on target company/job |
| **Section suggestions** | Detects missing sections based on role/industry |

API: `POST /api/copilot` (streaming, uses `streamWithFailover`)

---

## 5. Chat — Career Coach

Page: `/chat` → `chat/page.tsx`
API: `POST /api/chat` (streaming via `streamWithFailover`)

### 5.1 Chat Modes

| Mode | Trigger | What It Does |
|------|---------|-------------|
| **Coach mode** | Default | AI career coach — answers questions about resumes, jobs, interviews, salary. Knows user's resume context. |
| **Build mode** | Triggered by "Build with AI" wizard | Conversational resume builder. AI asks about experience, education, skills one section at a time. On completion, calls `/api/resume/from-chat` to create the resume. |

### 5.2 Chat Message Types

Defined in `app/types/resume.ts` → `ChatMessage`:

| Kind | Description |
|------|-------------|
| `text` | Plain text AI response |
| `matches` | Job match cards (inline 5-card preview after resume upload) |
| `resume` | Resume data structure (for parsing/display) |
| `form` | Form-like interaction |
| `entry` | Entry/quick action |

### 5.3 Build Wizard

Component: `app/components/chat/build-wizard.tsx`

Pre-chat configuration modal:
1. **Template selection** (Minimalist default)
2. **Target role** (required, e.g., "Frontend Engineer")
3. **Industry** (optional, helps tailor AI questions)
4. "Start Building" → switches chat to Build mode

---

## 6. Job Search Panel

Component: `app/components/resume/job-search-panel.tsx` (inside Resume Detail → "Find Jobs" tab)
API: `POST /api/jobs/search`

### 6.1 Search Controls

| Element | What It Does |
|---------|-------------|
| **Search input** | Job query (defaults to resume's AI-detected `role`) |
| **Location input** | Location filter (optional) |
| **Search button** | Fetches from free sources (FAST_FREE + SLOW_FREE tiers) |
| **Remote Only toggle** | Filters to `locationType === 'remote'` |
| **75%+ filter** | Filters to `score >= 75` |
| **Skill Search** | Free-text filter against job description/tags |
| **Load More** | Paginates additional results |
| **Search LinkedIn, Indeed & JobsDB** | Triggers paid source search via Apify actors (`includePaid: true`) |

### 6.2 Job Card Actions

| Button | What It Does | Navigation / API |
|--------|-------------|------------------|
| **Bookmark** (🤍→❤️) | Saves job to Application board's "Bookmark" column | `bookmarkJob(job)` → `POST /api/applications` |
| **ATS Fit** (🎯) | Opens ATS Optimizer with this job's JD pre-filled | Redirect to `/ats` with job context |
| **Interview** (🧠) | Opens Interview Practice pre-configured for this company/role | Redirect to `/interview` with context |
| **Apply** (↗) | Opens the original job posting URL in a new tab | `window.open(job.url)` |

### 6.3 Job Source Tiers

Defined in `app/lib/job-sources/types.ts` and ADR-004:

| Tier | Sources | Speed | Cost |
|------|---------|-------|------|
| **FAST_FREE** | RemoteOK, Himalayas, Remotive, The Muse, Arbeitnow, JobbKK | 1-3s | Free |
| **SLOW_FREE** | Greenhouse, Ashby | 3-10s | Free |
| **KEY_GATED** | Adzuna, JSearch | 1-3s | Free tier (monthly limit) |
| **PAID** | LinkedIn, Indeed, JobsDB | 5-15s | Apify credits |

### 6.4 Scoring

Jobs are scored 0-100 based on:
- **Skill overlap** (synonym-normalized keyword match between JD and resume skills)
- **Title match bonus** (+20 if title keyword matches)
- **Experience level detection** (entry/mid/senior inferred from title)

Score colors: **green ≥75** · **yellow ≥50** · **gray <50**

---

## 7. ATS Optimizer

Page: `/ats`
API: `POST /api/ai/ats-match`

### Flow

```
Paste JD text → Select Resume → Click "Analyze"
    │
    ▼
AI compares resume vs JD → Returns:
├── Overall score (0-100)
├── Category scores (Skills Match, Experience Fit, Impact Relevance)
├── Matched keywords
├── Missing keywords (clickable to add to resume)
└── Suggestions
```

### Elements

| Element | Description |
|---------|-------------|
| **Job Description** (textarea) | Paste full JD text (max 20,000 chars) |
| **Target Resume Profile** (dropdown) | Select which resume to analyze |
| **Analyze** (button) | Triggers AI analysis |
| **Match Score** | Big number 0-100 with category breakdown |
| **Matched Keywords** | Green list — skills found in both resume and JD |
| **Missing Keywords** | Red list — in JD but not in resume. Click to add to resume's skills |
| **Suggestions** | AI-generated actionable improvements |

Related flow spec: `docs/flow/ats-match.md`

---

## 8. Interview Practice

Page: `/interview`
API: `POST /api/ai/interview` (start/evaluate), `GET/POST /api/ai/interview/[id]` (save/load)

### Configuration

| Field | Options | Description |
|-------|---------|-------------|
| **Select Resume Profile** | User's resumes | Resume provides context for tailored questions |
| **Target Position & Company** | Free text | Company name + role title |
| **Interview Focus** | Behavioral / Technical / Mixed | Question type |
| **Difficulty Level** | Entry / Mid / Senior | Affects question complexity |
| **Interview Length** | Number | Number of questions |

### During Interview

| Button | What It Does |
|---------|-------------|
| **Speak** | Voice input via Web Speech API (`SpeechRecognition`) |
| **Stop Listening** | Ends voice capture |
| **Submit Answer** | Sends answer to AI for the current question |
| **Finish & Evaluate** | Ends interview → AI evaluates all answers |

### Results

| Element | Description |
|---------|-------------|
| **Evaluating screen** | Loading state: "Analyzing your answers..." |
| **Question-by-Question Breakdown** | Each question with: user answer, AI score (1-10), model answer, strengths, areas to improve |
| **Overall Score** | Average across all questions (e.g., "8.2") |
| **Try Again** | Starts a new interview with same settings |

### Interview Session Entity

Stored in `interview_sessions` table. The `exchanges` field is a JSON array:

```typescript
interface InterviewExchange {
  question: string
  category: 'behavioral' | 'technical'
  tags: string[]
  userAnswer: string
  score: number          // 1-10
  modelAnswer: string
  strengths: string[]
  improvements: string[]
}
```

---

## 9. Cover Letter

Two entry points:
1. **Resume Detail → Cover Letter tab** — `CoverLetterEditor` component (editor tied to a specific resume)
2. **Standalone page `/cover-letter`** — full generator with profile selector

API: `POST /api/ai/cover-letter` (generate), `GET/POST /api/cover-letters` (list/create), `GET/PATCH/DELETE /api/cover-letters/[id]` (CRUD)

### Input Modes

| Mode | Fields | Description |
|------|--------|-------------|
| **Quick Fields** | Company Name, Role Title, Wording/Focus (optional), Output Language | Fast generation with minimal input |
| **Full Job Description** | Company, Role, full JD text | Higher quality — AI has full context |

### Actions

| Button | What It Does |
|---------|-------------|
| **Generate** | Sends resume + job details to AI → creates cover letter (~300 words max) |
| **Save** | Persists to `cover_letters` table |
| **Copy** | Copies text to clipboard |
| **Download** | Exports as PDF via `@react-pdf/renderer` |
| **Delete** | Soft-deletes the cover letter |

Related flow spec: `docs/flow/cover-letter.md`

---

## 10. Job Tracker (Applications)

Page: `/applications`
Store: `useAppStore().applications` (type: `ApplicationBoard`)
API: `GET/POST /api/applications`

### Kanban Board

```
┌──────────────┬──────────────┬───────────────────┬──────────────┐
│  Bookmark    │  Applied     │  Interviewing     │  Offers      │
│  (saved)     │  (submitted) │  (in process)     │  (received)  │
├──────────────┼──────────────┼───────────────────┼──────────────┤
│  [Job Card]  │  [Job Card]  │  [Job Card]       │  [Job Card]  │
│  [Job Card]  │              │                   │              │
└──────────────┴──────────────┴───────────────────┴──────────────┘
     ↕ Drag-and-drop between columns (moveJob)
```

### Columns

| Column | Store Key | Meaning | Time label on move |
|--------|-----------|---------|-------------------|
| **Bookmark** | `bookmark` | Saved from job search | "saved" |
| **Applied** | `applied` | User has applied | "just now" |
| **Interviewing** | `interviewing` | Interview in progress | "scheduled" |
| **Offers** | `offers` | Job offer received | "received" |

### PipelineJob (card data)

```typescript
interface PipelineJob {
  key: string        // unique identifier
  company: string
  title: string      // job title
  loc: string        // location
  score: number      // match score
  level: 'high' | 'mid'
  url: string        // original job posting URL
  resume: string     // associated resume name
  logo: string
  color: string
  time: string       // status timestamp label
}
```

### Store Actions

| Action | What It Does |
|--------|-------------|
| `bookmarkJob(job)` | Adds job to Bookmark column |
| `toggleBookmark(key)` | Adds/removes from Bookmark |
| `isBookmarked(key)` | Checks if job is in Bookmark |
| `moveJob(key, from, to, index?)` | Moves job between columns (drag-and-drop) |
| `removeJob(key, col)` | Removes job from a column |
| `clearApplications()` | Clears entire board |

---

## 11. Upload & Resume Creation

Component: `app/components/layout/upload-modal.tsx`

### Upload Modal (opened from "+ New Resume")

```
┌───────────────────────────────────┐
│  Add a Resume                     │
├───────────────────────────────────┤
│  ┌─────────────────────────────┐  │
│  │  Drop file here or browse   │  │
│  │  PDF · DOCX · TXT · MD      │  │
│  │  (max 5MB)                  │  │
│  └─────────────────────────────┘  │
│           OR                      │
│  ┌─────────────────────────────┐  │
│  │  Build with AI              │  │
│  │  Answer questions · 5 min   │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

### File Upload Flow

| Step | What Happens | API |
|------|-------------|-----|
| 1. Select/drop file | Accepts `.pdf`, `.docx`, `.txt`, `.md` (max 5MB) | — |
| 2. Send to server | FormData upload | `POST /api/parse-resume` |
| 3. Server extracts text | PDF → `unpdf` (pdfjs), DOCX → `mammoth`, TXT/MD → plain read | — |
| 4. AI parses | Sends extracted text to AI → structured `Resume` object | AI failover |
| 5. Create resume | Saves to store + DB | `addResume()` → `POST /api/resumes` |
| 6. Navigate | Redirects to `/chat` (to show inline job matches) | — |

Rejected: `.doc` files ("Please save as .docx or PDF")

### Build with AI Flow

| Step | What Happens |
|------|-------------|
| 1. Open Build Wizard | Pick template, enter target role + industry |
| 2. Switch to Build mode | Chat switches to `mode: 'build'` |
| 3. AI-guided conversation | AI asks about experience, education, skills (one section at a time) |
| 4. Extract & create | On completion → `POST /api/resume/from-chat` → AI extracts structured resume from chat |
| 5. Navigate | Redirects to `/chat` or resume detail |

Related flow spec: `docs/flow/resume-builder.md`

---

## 12. Templates

Defined in `app/components/resume/templates/registry.ts`. Used for both preview and PDF export.

| Template | ID | Font | Layout | Best For |
|----------|----|------|--------|----------|
| **Minimalist** | `minimalist` | Inter (sans) | Single column, clean | Tech, startups, product |
| **Modern** | `modern` | Inter (sans) | Two-column sidebar, skill badges, accent colors | Tech, design, marketing |
| **Classic** | `classic` | Lora (serif) | Single column, traditional | Finance, law, consulting, academic |
| **Executive** | `executive` | Inter (sans) | Colored header bar, two-column, bold | Senior roles, management, C-suite |
| **Photo** | `photo` | Inter (sans) | Photo/initials + sidebar | Asian & European markets, creative |

Default: `minimalist`

PDF rendering: `@react-pdf/renderer` (server-side only, no headless browser).
Fonts loaded via `Font.register()` with environment-aware paths (URL for browser, filesystem for server).

PDF components: `app/components/resume/templates/{template-id}-pdf.tsx`
Preview component: `app/components/resume/resume-preview.tsx` (uses `<PDFViewer>` in iframe)

---

## 13. API Routes

All under `app/api/`. All AI routes use `withAuth` + failover wrappers.

### Resume Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/parse-resume` | POST | Upload file (FormData) → extract text → AI parse → return structured resume |
| `/api/resume/from-chat` | POST | Extract resume from chat conversation (Build mode completion) |
| `/api/resumes` | GET | List user's resumes |
| `/api/resumes` | POST | Create new resume |
| `/api/resumes/[id]` | GET | Get single resume |
| `/api/resumes/[id]` | PATCH | Update resume data |
| `/api/resumes/[id]` | DELETE | Soft-delete resume (`deletedAt`) |

### AI Routes

| Route | Method | AI Function | Description |
|-------|--------|-------------|-------------|
| `/api/chat` | POST | `streamWithFailover` | Career coach / build mode streaming chat |
| `/api/copilot` | POST | `streamWithFailover` | Resume editor Co-Pilot sidebar chat |
| `/api/ai/ats-match` | POST | `generateObjectWithFailover` | ATS score + keyword analysis |
| `/api/ai/tailor` | POST | `generateObjectWithFailover` | AI optimize resume for a job |
| `/api/ai/cover-letter` | POST | `generateTextWithFailover` | Generate cover letter text |
| `/api/ai/interview` | POST | `generateObjectWithFailover` | Generate questions / evaluate answers |
| `/api/ai/interview/[id]` | GET | — | List user's interview sessions |
| `/api/ai/interview/[id]` | POST | — | Save interview session |

### Job Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/jobs/search` | POST | Search all enabled job sources (parallel, with cache) |
| `/api/jobs/source-health` | GET | Check which sources are currently responding |
| `/api/scrape` | POST | Scrape JD from a URL (with SSRF protection) |

### Application Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/applications` | GET | Get application board state |
| `/api/applications` | POST | Save application board state |

### Cover Letter Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cover-letters` | GET | List user's cover letters |
| `/api/cover-letters` | POST | Create cover letter |
| `/api/cover-letters/[id]` | GET | Get single cover letter |
| `/api/cover-letters/[id]` | PATCH | Update cover letter |
| `/api/cover-letters/[id]` | DELETE | Soft-delete cover letter |

### User Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/email` | GET/PATCH | Get/update email |
| `/api/user/account` | GET/PATCH | Get/update account info |
| `/api/user/preferences` | GET/PATCH | Get/update notification preferences |

### Auth & Export Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...all]` | ALL | Better Auth catch-all handler |
| `/api/auth/is-admin` | GET | Check if current user is admin |
| `/api/export/pdf` | GET | Generate + stream PDF for a resume (`?id=[resumeId]`) |

---

## 14. Domain Terms

| Term | Definition | Where Used |
|------|-----------|------------|
| **ATS** | Applicant Tracking System. Software employers use to filter resumes by keywords and criteria before a human sees them. | ATS Optimizer, Match Score |
| **ATS Match Score** | 0-100 score indicating how well a resume matches a job description. Higher = more keyword/category overlap. | `/api/ai/ats-match`, Job cards, Resume score badge |
| **Tailored Resume** | A copy of a base resume optimized by AI for a specific job. May have rewritten summary, reordered skills, adjusted bullet points. | `tailored_resumes` table, AI Optimize button |
| **Match Score (Job)** | 0-100 score based on skill overlap between a job's JD and the user's resume. Different from ATS Match Score (which is per-JD analysis). | Job Search Panel |
| **Skill Overlap** | Number of resume skills that appear in a job description. Synonym-normalized (e.g., "React.js" → "react"). | Job scoring |
| **Experience Level** | Inferred from job title: `entry`, `mid`, or `senior`. Affects job matching and interview difficulty. | Job Search, Interview Practice |
| **Co-Pilot** | AI assistant embedded in the Resume Editor sidebar. Helps rewrite sections, suggests keywords, detects missing content. | `ResumeCopilot` component, `/api/copilot` |
| **Career Coach** | The main AI chat interface. Acts as a career advisor that knows the user's resume. Can operate in Coach or Build mode. | `/chat` |
| **Build Wizard** | Pre-chat configuration for building a resume from scratch. Collects template, role, industry before starting AI-guided conversation. | `BuildWizard` component |
| **Pipeline** | The application tracking board with 4 stages: Bookmark → Applied → Interviewing → Offers. | Job Tracker |
| **Exchange** | A single Q&A pair in a mock interview session. Contains question, user answer, AI score, model answer, strengths, improvements. | `interview_sessions.exchanges` |
| **Section Suggestion** | AI-driven recommendation to add a resume section (e.g., "You're in finance — add Certifications?"). Based on detected role. | Resume Editor banner |
| **SSRF Guard** | Server-Side Request Forgery protection. Blocks scraping requests to private IPs, loopback, cloud metadata endpoints. Prevents the scraper from being used as a proxy to internal services. | `app/lib/scraper.ts` |
| **Template** | Visual layout theme for resume PDF rendering. 5 options: Minimalist, Modern, Classic, Executive, Photo. | Template Gallery, PDF export |

---

## 15. Infrastructure Terms

| Term | Definition | File / Config |
|------|-----------|---------------|
| **AI Failover** | Two-provider retry chain. Primary (DeepSeek Official) fails → automatically retries on Fallback (DeepInfra). Same model (DeepSeek V4 Flash) on both. | `app/lib/ai-providers.ts`, ADR-003 |
| **No-Thinking Provider** | Wrapper that disables DeepSeek's chain-of-thought (`thinking: { type: 'disabled' }`) for structured JSON responses. Prevents wasted tokens. Also converts `json_schema` → `json_object` for DeepSeek compatibility. | `createNoThinkingProvider()` in `ai-providers.ts` |
| **Fail-Open Policy** | External services (PostHog, Upstash Redis, Rate Limiter) must NEVER block core features. All calls wrapped in try/catch that silently returns null on failure. | `posthog-server.ts`, `ratelimit.ts` |
| **proxy.ts** | Next.js 16 middleware (renamed from `middleware.ts`). Handles locale redirect + public/protected route detection. Function name: `proxy`. | Root `proxy.ts` |
| **AuthGuard** | Client-side session guard in `(app)/layout.tsx`. Calls `authClient.getSession()`. Redirects to `/login` if no session. | `app/[locale]/(app)/layout.tsx` |
| **Optimistic Update** | UI state updates immediately, then API call persists. On failure, state rolls back and shows error toast. Pattern used throughout `useAppStore`. | `app/lib/store.tsx` |
| **withAuth** | Server-side auth wrapper for API routes. Reads session cookie via headers, returns 401 if invalid. | `app/lib/with-auth.ts` |
| **Upstash Cache** | Redis cache for job search results. Key: `query::location`. TTL: 6 hours. Re-scored per user on cache hit (since scores are user-specific). | `app/lib/job-sources/index.ts` |

---

*Last updated: 2026-07-14*
