// ═══════════════════════════════════════════════════════════════
// DOMAIN TYPES — Match the demo's data model
// ═══════════════════════════════════════════════════════════════

export interface Company {
  logo: string
  color: string
  name: string
  role: string
  loc: string
  work: 'remote' | 'hybrid' | 'onsite'
  visa: boolean
  salary: string
  score: number
  level: 'high' | 'mid'
  url: string
  missing?: string[]
  transferable?: string[]
}

export interface ResumeExperience {
  company: string
  role: string
  dates: string
  bullets: string[]
}

export type ResumeTemplate = 'minimalist' | 'modern' | 'classic' | 'executive' | 'photo'

export interface ResumeEducation {
  institution: string
  degree: string
  field: string
  dates: string
}

export interface ResumeProject {
  name: string
  description: string
  techStack: string[]
  link: string
}

export interface ResumeCertification {
  name: string
  issuer: string
  date: string
}

export interface ResumeLanguage {
  name: string
  proficiency: string
}

export interface CustomSectionItem {
  title: string
  subtitle: string
  date: string
  description: string
  link: string
}

export type CustomSectionType = 'bullets' | 'dated-items' | 'grid'

export interface ResumeCustomSection {
  id: string                     // Stable ID for DnD ordering in sectionOrder
  title: string
  type?: CustomSectionType       // Optional — old resumes don't have this
  items?: CustomSectionItem[]    // Optional — old resumes use bullets instead
  bullets: string[]              // Backward compat — kept for existing resumes
}

export interface Resume {
  id: string
  name: string          // Display name (filename or custom title) — shown in sidebar, dropdowns
  role: string          // AI-detected job title — used for job search, AI context
  persona: string       // Person's real name
  email?: string
  phone?: string
  location?: string
  github?: string
  photoUrl?: string        // Optional profile photo URL (for photo template)
  score: number
  updated: string
  skills: string[]
  summary?: string
  experience?: ResumeExperience[]
  education?: ResumeEducation[]
  projects?: ResumeProject[]
  certifications?: ResumeCertification[]
  languages?: ResumeLanguage[]
  customSections?: ResumeCustomSection[]
  companies: Company[]
  stretch: Company[]
  template?: ResumeTemplate
  baseResumeId?: string       // ID of parent resume if this is a tailored variant
  isVariant?: boolean         // True if this resume is a tailored variant (not a base)
  variantLabel?: string       // Display label, e.g. "Tailored for Google — SWE"
  // ── Editor layout state (V2) ──
  sectionOrder?: string[]              // Ordered section IDs for PDF rendering + editor DnD
  sectionVisibility?: Record<string, boolean>  // Section ID → visible in PDF. Missing = true.
}

// Default section order — used when resume.sectionOrder is missing
export const DEFAULT_SECTION_ORDER: string[] = [
  'summary',
  'education',
  'skills',
  'experience',
  'projects',
  'certifications',
  'languages',
]

// Sections that appear in the editor's left panel but NOT in the PDF body
// (basic info is always rendered in the PDF header, not as a section)
export const NON_PDF_SECTIONS = ['basic'] as const

export interface PipelineJob {
  key: string
  applicationId?: string
  logo: string
  color: string
  company: string
  title: string
  loc: string
  score: number
  level: 'high' | 'mid'
  time: string
  url: string
  resume: string
  addedAt: string
  appliedAt?: string
  notes?: string
  salary?: string
  jobData?: Record<string, unknown>
}

export interface ApplicationBoard {
  bookmark: PipelineJob[]
  applied: PipelineJob[]
  interviewing: PipelineJob[]
  offers: PipelineJob[]
  rejected: PipelineJob[]
}

export type ApplicationColumnId = keyof ApplicationBoard

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  name: string
  content: string
  kind?: 'text' | 'matches' | 'resume' | 'form' | 'entry'
  data?: unknown
}

export interface JobDescription {
  title: string
  company: string
  location: string
  description: string
  requirements: string[]
  qualifications: string[]
}

// ── Tailor review mode ──

export type TailorChangeField = 'summary' | 'skill-add' | 'skill-remove' | 'bullet' | 'role'

export interface TailorChange {
  id: string
  field: TailorChangeField
  label: string               // Human-readable label, e.g. "Summary", "Experience bullet 2"
  anchor?: {
    experienceIndex?: number
    bulletIndex?: number
  }
  before: string
  after: string
  rationale?: string
}

export interface TailorResult {
  optimized: Resume           // Fully-optimized resume (all changes applied)
  changes: TailorChange[]     // Individual changes for review
}

export interface PendingTailor {
  baseResumeId: string        // The original resume being tailored
  baseResume: Resume          // Snapshot of original before changes
  optimized: Resume           // Fully-optimized version from AI
  changes: TailorChange[]     // Individual changes
  accepted: Set<string>       // IDs of accepted changes (Set<TailorChange.id>)
  jobContext?: {              // Optional job info for labeling the variant
    company?: string
    title?: string
  }
}
