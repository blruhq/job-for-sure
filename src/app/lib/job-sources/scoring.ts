// ═══════════════════════════════════════════════════════════════
// SCORING — Tier-1 keyword overlap (instant, free, no LLM)
//
// score = coverage * 80 + titleMatch * 20
//   coverage = how many of the user's skills appear in the JD
//   titleMatch = does the user's target role appear in the job title
// ═══════════════════════════════════════════════════════════════

import type { JobResult, ScoredJob } from './types'
import { parseLocation } from './geo'

// Normalize a skill for matching: lowercase, strip version numbers
// and common suffixes so "React.js" matches "React", "Node.js" matches "Node"
const SKILL_SYNONYMS: Record<string, string> = {
  'react.js': 'react',
  'reactjs': 'react',
  'node.js': 'node',
  'nodejs': 'node',
  'typescript': 'typescript',
  'ts': 'typescript',
  'javascript': 'javascript',
  'js': 'javascript',
  'next.js': 'next',
  'nextjs': 'next',
  'vue.js': 'vue',
  'vuejs': 'vue',
  'nuxt.js': 'nuxt',
  'express.js': 'express',
  'postgres': 'postgresql',
  'postgres.js': 'postgresql',
  'k8s': 'kubernetes',
  'gcp': 'google cloud',
  'aws': 'aws',
}

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim()
  return SKILL_SYNONYMS[lower] || lower
}

export function scoreJob(
  job: JobResult,
  skills: string[],
  role?: string,
  location?: string,
): ScoredJob {
  const haystack = `${job.title} ${job.description} ${(job.tags || []).join(' ')}`.toLowerCase()

  // Match each skill (with synonym normalization)
  const normalizedSkills = skills.map(normalizeSkill)
  const matchedSkills: string[] = []

  for (let i = 0; i < skills.length; i++) {
    const normalized = normalizedSkills[i]
    // Check both the normalized form and the original
    if (haystack.includes(normalized) || haystack.includes(skills[i].toLowerCase())) {
      matchedSkills.push(skills[i])
    }
  }

  // Coverage: fraction of user's skills that appear in the JD
  const coverage = skills.length > 0 ? matchedSkills.length / skills.length : 0

  // Title match: does the user's role appear in the job title?
  let titleMatch = 0
  if (role) {
    const roleLower = role.toLowerCase()
    const titleLower = job.title.toLowerCase()
    // Check for partial role match (e.g., "frontend" in "Senior Frontend Engineer")
    const roleWords = roleLower.split(/\s+/).filter((w) => w.length > 3)
    if (roleWords.some((w) => titleLower.includes(w))) {
      titleMatch = 1
    }
  }

  // Location Proximity Bonus: City (+20), Country (+10), Global (+0)
  // Uses structured country field when available (reliable across scripts/languages),
  // falls back to text matching for sources without country data.
  let locationBonus = 0
  if (location) {
    const userParsed = parseLocation(location)
    const userCountry = userParsed.country
    const userCity = userParsed.city?.toLowerCase()

    // 1. Country match via ISO code (reliable — works across Thai/English scripts)
    if (userCountry && job.country && job.country === userCountry) {
      locationBonus = 10
    }
    // 2. City text match (bonus on top of country match)
    if (userCity) {
      const jobLocLower = job.location.toLowerCase()
      if (jobLocLower.includes(userCity)) {
        locationBonus = 20
      }
    }
    // 3. Fallback: if no structured country data, try text matching
    if (locationBonus === 0 && !job.country) {
      const locLower = location.toLowerCase().trim()
      const jobLocLower = job.location.toLowerCase().replace(/\./g, '')
      const tokens = locLower
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1)

      if (tokens.length > 0) {
        const cityToken = tokens[0]
        const countryToken = tokens[tokens.length - 1]

        if (jobLocLower.includes(cityToken)) {
          locationBonus = 20
        } else if (jobLocLower.includes(countryToken)) {
          locationBonus = 10
        }
      }
    }
  }

  const score = Math.round(coverage * 80 + titleMatch * 20 + locationBonus)

  return {
    ...job,
    score: Math.min(100, Math.max(0, score)),
    matchedSkills,
  }
}

export function rankJobs(
  jobs: JobResult[],
  skills: string[],
  role?: string,
  location?: string,
): ScoredJob[] {
  return jobs
    .map((job) => scoreJob(job, skills, role, location))
    .sort((a, b) => b.score - a.score)
}

// ── Experience inference (from job title keywords) ────────────
const SENIOR_KEYWORDS = /\b(senior|lead|principal|staff|director|head|chief|vp|architect)\b/i
const ENTRY_KEYWORDS = /\b(junior|entry|intern|internship|graduate|associate|trainee|apprentice)\b/i

export function inferExperienceLevel(title: string): 'entry' | 'mid' | 'senior' {
  if (SENIOR_KEYWORDS.test(title)) return 'senior'
  if (ENTRY_KEYWORDS.test(title)) return 'entry'
  return 'mid'
}
