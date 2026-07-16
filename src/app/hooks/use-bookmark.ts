import { useCreateApplication, useDeleteApplication, useApplications } from '~/hooks/use-apps'
import type { PipelineJob } from '~/types/resume'
import type { ScoredJob } from '~/lib/job-sources/types'
import { notify } from '~/lib/toast'

// Convert a ScoredJob (from search results) to the payload shape for createApplication
function scoredJobToBookmarkPayload(job: ScoredJob, resumeId?: string) {
  return {
    sourceKey: job.key,
    company: job.company,
    jobTitle: job.title,
    jobUrl: job.url || undefined,
    location: job.loc || undefined,
    salary: job.salary || undefined,
    logoUrl: job.logo || undefined,
    color: job.color || undefined,
    level: job.level || undefined,
    matchScore: job.score || undefined,
    resumeId: resumeId || undefined,
    status: 'bookmarked' as const,
  }
}

// Convert a PipelineJob (from board) to the same payload shape
function pipelineJobToBookmarkPayload(job: PipelineJob) {
  return {
    sourceKey: job.key,
    company: job.company,
    jobTitle: job.title,
    jobUrl: job.url || undefined,
    location: job.loc || undefined,
    salary: job.salary || undefined,
    logoUrl: job.logo || undefined,
    color: job.color || undefined,
    level: job.level || undefined,
    matchScore: job.score || undefined,
    resumeId: job.resume || undefined,
    status: 'bookmarked' as const,
  }
}

/**
 * Shared bookmark toggle hook.
 * Usage: const { isBookmarked, toggleBookmark } = useBookmarkJob()
 *
 * Works for both ScoredJob (search results) and PipelineJob (board cards).
 */
export function useBookmarkJob() {
  const { data: applications } = useApplications()
  const { mutateAsync: createBookmark } = useCreateApplication()
  const { mutateAsync: deleteBookmark } = useDeleteApplication()

  const isBookmarked = (key: string) =>
    applications?.bookmark.some((j) => j.key === key) ?? false

  const toggleBookmark = (job: ScoredJob | PipelineJob, resumeId?: string) => {
    const existing = applications?.bookmark.find((j) => j.key === job.key)
    if (existing?.applicationId) {
      deleteBookmark(existing.applicationId)
      return
    }
    // ScoredJob has `loc`, PipelineJob also has `loc` — both work
    if ('key' in job && 'company' in job) {
      if ('source' in job) {
        // ScoredJob
        createBookmark(scoredJobToBookmarkPayload(job as ScoredJob, resumeId))
      } else {
        // PipelineJob
        createBookmark(pipelineJobToBookmarkPayload(job as PipelineJob))
      }
    }
  }

  return { isBookmarked, toggleBookmark }
}
