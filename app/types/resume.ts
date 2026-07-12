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

export interface ResumeCustomSection {
  title: string
  bullets: string[]
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
  coverLetter?: string
  coverLetterJD?: string
}

export interface PipelineJob {
  key: string
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
}

export interface ApplicationBoard {
  bookmark: PipelineJob[]
  applied: PipelineJob[]
  interviewing: PipelineJob[]
  offers: PipelineJob[]
}

export type ApplicationColumnId = keyof ApplicationBoard

export interface ChatMessage {
  id: string
  role: 'coach' | 'user'
  name: string
  content: string
  kind?: 'text' | 'matches' | 'resume' | 'form' | 'entry'
  data?: unknown
}

// ── Legacy types for API route compatibility ──
export interface Education {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa?: string
}

export interface Experience {
  company: string
  role: string
  location: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface Skill {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface Project {
  name: string
  description: string
  techStack: string[]
  link?: string
}

export interface Activity {
  organization: string
  role: string
  description: string
}

export interface Language {
  name: string
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native'
}

export interface ResumeData {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  location: string
  summary: string
  education: Education[]
  experience: Experience[]
  skills: Skill[]
  projects: Project[]
  extracurricular: Activity[]
  languages: Language[]
  templateId: string
  createdAt: string
  updatedAt: string
}

export interface JobDescription {
  title: string
  company: string
  location: string
  description: string
  requirements: string[]
  qualifications: string[]
}
