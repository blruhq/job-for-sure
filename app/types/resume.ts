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

export type ResumeTemplate = 'minimalist' | 'modern' | 'classic'

export interface Resume {
  id: number
  name: string
  persona: string
  email?: string
  phone?: string
  location?: string
  github?: string
  score: number
  updated: string
  skills: string[]
  summary?: string
  experience?: ResumeExperience[]
  companies: Company[]
  stretch: Company[]
  template?: ResumeTemplate
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

export interface Pipeline {
  bookmark: PipelineJob[]
  applied: PipelineJob[]
  interviewing: PipelineJob[]
  offers: PipelineJob[]
}

export type PipelineColumnId = keyof Pipeline

export interface ChatMessage {
  id: string
  role: 'coach' | 'user'
  name: string
  content: string
  kind?: 'text' | 'matches' | 'resume' | 'form' | 'entry'
  data?: unknown
}

// Keep legacy types for API routes
export interface Education {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa?: string
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

export interface JobDescription {
  title: string
  company: string
  location: string
  description: string
  requirements: string[]
  qualifications: string[]
}
