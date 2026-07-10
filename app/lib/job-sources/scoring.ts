// ═══════════════════════════════════════════════════════════════
// SCORING — Tier-1 keyword overlap (instant, free, no LLM)
//
// score = coverage * 80 + titleMatch * 20
//   coverage = how many of the user's skills appear in the JD
//   titleMatch = does the user's target role appear in the job title
// ═══════════════════════════════════════════════════════════════

import type { JobResult, ScoredJob } from './types'

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

  const score = Math.round(coverage * 80 + titleMatch * 20)

  return {
    ...job,
    score: Math.min(100, Math.max(0, score)),
    matchedSkills,
  }
}

export function rankJobs(jobs: JobResult[], skills: string[], role?: string): ScoredJob[] {
  return jobs
    .map((job) => scoreJob(job, skills, role))
    .sort((a, b) => b.score - a.score)
}
