import { useUIStore } from '~/hooks/use-ui'
import { useResumes } from '~/hooks/use-resumes'
import type { Resume } from '~/types/resume'

export function useActiveResume() {
  const activeResumeId = useUIStore((s) => s.activeResumeId)
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const { data: resumes = [] } = useResumes()

  const activeResume = resumes.find((r) => r.id === activeResumeId) ?? null

  return { activeResume, activeResumeId, setActiveResumeId, resumes }
}

export function getResume(resumes: Resume[], id: string): Resume | undefined {
  return resumes.find((r) => r.id === id)
}
