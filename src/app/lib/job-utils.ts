import type { PipelineJob } from '~/types/resume'
import type { ScoredJob } from '~/lib/job-sources/types'

/**
 * Converts a ScoredJob (from search results / chat) to a PipelineJob
 * (used by Kanban board and JobDetailPanel).
 * Maps the different field names between the two types.
 */
export function scoredJobToPipelineJob(
  job: ScoredJob,
  userSkills: string[],
  overrides?: Partial<PipelineJob>,
): PipelineJob {
  const matchedSet = new Set(job.matchedSkills.map((s) => s.toLowerCase()))
  const missing = userSkills.filter((s) => !matchedSet.has(s.toLowerCase()))

  return {
    key: job.id,
    company: job.company,
    title: job.title,
    loc: job.location,
    logo: job.companyLogo || '',
    color: '',
    score: job.score,
    level: job.score >= 75 ? 'high' : 'mid',
    time: 'new',
    url: job.url,
    resume: '',
    addedAt: new Date().toISOString(),
    salary: job.salary || '',
    jobData: {
      description: job.description || '',
      matchedSkills: job.matchedSkills || [],
      missingSkills: missing,
      source: job.source,
      locationType: job.locationType,
      tags: job.tags,
      visaSponsorship: job.visaSponsorship,
      country: job.country,
      descriptionHtml: job.descriptionHtml,
      companyLogo: job.companyLogo,
      department: job.department,
      region: job.region,
      postedAt: job.postedAt,
      experienceLevel: job.experienceLevel,
      experienceYears: job.experienceYears,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
    },
    ...overrides,
  }
}
