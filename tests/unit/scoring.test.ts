import { describe, it, expect } from 'vitest'
import { scoreJob, rankJobs, inferExperienceLevel } from '~/lib/job-sources/scoring'
import { filterByQuery } from '~/lib/job-sources'
import type { JobResult } from '~/lib/job-sources/types'

// Helper to create a minimal job
function makeJob(overrides: Partial<JobResult> = {}): JobResult {
  return {
    id: 'test-1',
    source: 'remoteok',
    company: 'TestCo',
    title: 'Software Engineer',
    location: 'Remote',
    locationType: 'remote',
    url: 'https://example.com',
    description: 'We use React and Node.js',
    ...overrides,
  }
}

describe('scoreJob', () => {
  it('returns score 0 when no skills overlap', () => {
    const job = makeJob({ description: 'We use Python and Django' })
    const result = scoreJob(job, ['React', 'TypeScript'], 'Designer')
    expect(result.score).toBe(0)
    expect(result.matchedSkills).toEqual([])
  })

  it('returns score > 0 when skills overlap', () => {
    const job = makeJob({ description: 'We use React and TypeScript' })
    const result = scoreJob(job, ['React', 'TypeScript'], undefined)
    // 2/2 coverage = 80, no title match = 0 → score 80
    expect(result.score).toBe(80)
    expect(result.matchedSkills).toEqual(['React', 'TypeScript'])
  })

  it('handles partial skill overlap', () => {
    const job = makeJob({ description: 'We use React' })
    const result = scoreJob(job, ['React', 'Python', 'Go'], undefined)
    // 1/3 coverage = 26.67 → 27, no title match → score 27
    expect(result.score).toBe(27)
    expect(result.matchedSkills).toEqual(['React'])
  })

  it('normalizes skill synonyms (React.js → react)', () => {
    const job = makeJob({ description: 'We use React' })
    const result = scoreJob(job, ['React.js'], undefined)
    expect(result.score).toBe(80)
    expect(result.matchedSkills).toEqual(['React.js'])
  })

  it('normalizes Node.js → node', () => {
    const job = makeJob({ description: 'Experience with Node' })
    const result = scoreJob(job, ['Node.js'], undefined)
    expect(result.score).toBe(80)
  })

  it('adds title match bonus (+20)', () => {
    const job = makeJob({ title: 'Senior Frontend Engineer' })
    const result = scoreJob(job, [], 'Frontend Developer')
    // 0 skills → coverage 0, but "frontend" in title → titleMatch 1 → 20
    expect(result.score).toBe(20)
  })

  it('caps score at 100', () => {
    const job = makeJob({
      title: 'Senior Frontend Developer',
      description: 'React TypeScript JavaScript',
    })
    const result = scoreJob(job, ['React', 'TypeScript', 'JavaScript'], 'Frontend Developer')
    // 3/3 coverage = 80, titleMatch = 20 → 100
    expect(result.score).toBe(100)
  })

  it('clamps score to minimum 0', () => {
    const job = makeJob({ description: 'Nothing relevant', title: 'Sales Manager' })
    const result = scoreJob(job, ['React'], 'Engineer')
    expect(result.score).toBe(0)
  })

  it('returns score 0 when user has no skills', () => {
    const job = makeJob()
    const result = scoreJob(job, [], undefined)
    expect(result.score).toBe(0)
  })
})

describe('rankJobs', () => {
  it('sorts jobs by score descending', () => {
    const jobs = [
      makeJob({ id: '1', description: 'Python', title: 'Dev' }),
      makeJob({ id: '2', description: 'React TypeScript', title: 'Dev' }),
      makeJob({ id: '3', description: 'React TypeScript Go', title: 'Dev' }),
    ]
    const ranked = rankJobs(jobs, ['React', 'TypeScript', 'Go'], undefined)
    expect(ranked[0].id).toBe('3') // 3/3 = 80
    expect(ranked[1].id).toBe('2') // 2/3 = 53
    expect(ranked[2].id).toBe('1') // 0/3 = 0
  })

  it('returns empty array for empty input', () => {
    expect(rankJobs([], ['React'], undefined)).toEqual([])
  })
})

describe('inferExperienceLevel', () => {
  it('detects senior keywords', () => {
    expect(inferExperienceLevel('Senior Engineer')).toBe('senior')
    expect(inferExperienceLevel('Lead Developer')).toBe('senior')
    expect(inferExperienceLevel('Staff Engineer')).toBe('senior')
    expect(inferExperienceLevel('Principal Architect')).toBe('senior')
    expect(inferExperienceLevel('VP of Engineering')).toBe('senior')
    expect(inferExperienceLevel('Head of Data')).toBe('senior')
    expect(inferExperienceLevel('Director')).toBe('senior')
    expect(inferExperienceLevel('Chief Technology Officer')).toBe('senior')
  })

  it('detects entry keywords', () => {
    expect(inferExperienceLevel('Junior Developer')).toBe('entry')
    expect(inferExperienceLevel('Entry Level Analyst')).toBe('entry')
    expect(inferExperienceLevel('Intern')).toBe('entry')
    expect(inferExperienceLevel('Graduate Trainee')).toBe('entry')
    expect(inferExperienceLevel('Associate')).toBe('entry')
    expect(inferExperienceLevel('Apprentice')).toBe('entry')
  })

  it('defaults to mid for no keywords', () => {
    expect(inferExperienceLevel('Software Engineer')).toBe('mid')
    expect(inferExperienceLevel('Product Manager')).toBe('mid')
    expect(inferExperienceLevel('Designer')).toBe('mid')
  })
})

describe('filterByQuery token-based location matching', () => {
  const jobs: JobResult[] = [
    makeJob({ id: '1', title: 'React Developer', location: 'Bangkok', locationType: 'onsite' }),
    makeJob({ id: '2', title: 'React Developer', location: 'Thailand', locationType: 'onsite' }),
    makeJob({ id: '3', title: 'React Developer', location: 'Bangkok, Thailand', locationType: 'onsite' }),
    makeJob({ id: '4', title: 'React Developer', location: 'Singapore', locationType: 'onsite' }),
    makeJob({ id: '5', title: 'React Developer', location: 'Remote', locationType: 'remote' }),
  ]

  it('matches Bangkok and Thailand bidirectionally when location is Bangkok, Thailand', () => {
    const results = filterByQuery(jobs, 'React', 'Bangkok, Thailand')
    const ids = results.map(r => r.id)
    // Should keep Bangkok (id 1), Thailand (id 2), Bangkok, Thailand (id 3), and Remote (id 5)
    expect(ids).toContain('1')
    expect(ids).toContain('2')
    expect(ids).toContain('3')
    expect(ids).toContain('5')
    // Should discard Singapore (id 4)
    expect(ids).not.toContain('4')
  })

  it('matches correctly when location has single token Bangkok', () => {
    const results = filterByQuery(jobs, 'React', 'Bangkok')
    const ids = results.map(r => r.id)
    expect(ids).toContain('1')
    expect(ids).toContain('3')
    expect(ids).not.toContain('2')
    expect(ids).not.toContain('4')
  })

  it('handles remote job geographical restriction filtering correctly', () => {
    const remoteJobs: JobResult[] = [
      makeJob({ id: 'r1', title: 'React Developer', location: 'Remote - USA', locationType: 'remote' }),
      makeJob({ id: 'r2', title: 'React Developer', location: 'Remote - Canada', locationType: 'remote' }),
      makeJob({ id: 'r3', title: 'React Developer', location: 'Remote - UK', locationType: 'remote' }),
      makeJob({ id: 'r4', title: 'React Developer', location: 'Remote - APAC', locationType: 'remote' }),
      makeJob({ id: 'r5', title: 'React Developer', location: 'Remote - Global', locationType: 'remote' }),
      makeJob({ id: 'r6', title: 'React Developer', location: 'Remote - Europe', locationType: 'remote' }),
      makeJob({ id: 'r7', title: 'React Developer', location: 'Remote - Thailand', locationType: 'remote' }),
      makeJob({ id: 'r8', title: 'React Developer', location: 'Remote u.s.a.', locationType: 'remote' }),
    ]

    const results = filterByQuery(remoteJobs, 'React', 'Bangkok, Thailand')
    const ids = results.map(r => r.id)
    
    // Should keep r4 (APAC), r5 (Global), and r7 (Thailand)
    expect(ids).toContain('r4')
    expect(ids).toContain('r5')
    expect(ids).toContain('r7')
    
    // Should discard r1 (USA), r2 (Canada), r3 (UK), r6 (Europe), r8 (u.s.a.)
    expect(ids).not.toContain('r1')
    expect(ids).not.toContain('r2')
    expect(ids).not.toContain('r3')
    expect(ids).not.toContain('r6')
    expect(ids).not.toContain('r8')
  })
})
