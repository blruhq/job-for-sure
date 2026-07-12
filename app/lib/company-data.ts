import type { Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// RESUME FACTORY — creates Resume objects from REAL data
// No mock companies. No hardcoded skills. No fake scores.
// Company matching is handled by /api/match-companies (AI-powered).
// ═══════════════════════════════════════════════════════════════

export function createResume(data: {
  name: string
  role: string
  persona: string
  email?: string
  phone?: string
  location?: string
  github?: string
  summary?: string
  skills: string[]
  experience?: Resume['experience']
  education?: Resume['education']
  projects?: Resume['projects']
  certifications?: Resume['certifications']
  languages?: Resume['languages']
  customSections?: Resume['customSections']
}): Resume {
  return {
    id: crypto.randomUUID(),
    name: data.name,
    role: data.role,
    persona: data.persona,
    email: data.email,
    phone: data.phone,
    location: data.location,
    github: data.github,
    summary: data.summary,
    score: 0,
    updated: 'just now',
    skills: data.skills,
    experience: data.experience,
    education: data.education,
    projects: data.projects,
    certifications: data.certifications,
    languages: data.languages,
    customSections: data.customSections,
    companies: [],
    stretch: [],
  }
}

// Generate a brand color from a company name (for UI avatars)
export function companyColor(name: string): string {
  const colors = [
    '#5B6ABF', '#3ECF8E', '#F38020', '#635BFF',
    '#5E6AD2', '#7B3FF2', '#E8482B', '#0EA5E9',
    '#8B5CF6', '#10B981', '#F59E0B', '#EC4899',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Generate a logo initials from company name
export function companyLogo(name: string): string {
  return name.charAt(0).toUpperCase()
}
