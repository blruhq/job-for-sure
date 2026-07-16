import { useCreateApplication, useDeleteApplication, useApplications } from '~/hooks/use-apps'
import type { CreateApplicationPayload } from '~/lib/api-client'

/**
 * Shared bookmark toggle hook.
 *
 * Usage:
 *   const { isBookmarked, toggleBookmark } = useBookmarkJob()
 *   isBookmarked(job.key)  // → boolean
 *   toggleBookmark({ sourceKey, company, jobTitle, ... })  // creates or deletes
 *
 * The caller is responsible for mapping their job type (ScoredJob, PipelineJob, etc.)
 * to the CreateApplicationPayload shape.
 */
export function useBookmarkJob() {
  const { data: applications } = useApplications()
  const { mutateAsync: createBookmark } = useCreateApplication()
  const { mutateAsync: deleteBookmark } = useDeleteApplication()

  const isBookmarked = (key: string) =>
    applications?.bookmark.some((j) => j.key === key) ?? false

  const toggleBookmark = (payload: CreateApplicationPayload) => {
    const existing = applications?.bookmark.find((j) => j.key === payload.sourceKey)
    if (existing?.applicationId) {
      deleteBookmark(existing.applicationId)
      return
    }
    createBookmark(payload)
  }

  return { isBookmarked, toggleBookmark }
}
