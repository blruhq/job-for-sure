import type { Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// RESUME FACTORY — creates Resume objects from REAL data
// No mock companies. No hardcoded skills. No fake scores.
// Company matching is handled by /api/match-companies (AI-powered).
// ═══════════════════════════════════════════════════════════════

let resumeCounter = 0

export function createResume(data: {
  name: string
  persona: string
  email?: string
  location?: string
  summary?: string
  skills: string[]
  experience?: Resume['experience']
}): Resume {
  resumeCounter++
  return {
    id: Date.now() + resumeCounter,
    name: data.name,
    persona: data.persona,
    email: data.email,
    location: data.location,
    summary: data.summary,
    score: 0, // Will be set by AI matching
    updated: 'just now',
    skills: data.skills,
    experience: data.experience,
    companies: [], // Will be populated by /api/match-companies
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
