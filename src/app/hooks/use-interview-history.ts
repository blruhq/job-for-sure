import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InterviewSessionRow } from '~/types/interview'

/**
 * Fetch interview session history via TanStack Query.
 * Replaces raw fetch('/api/ai/interview') in interview-view.tsx.
 */
export function useInterviewHistory() {
  return useQuery({
    queryKey: ['interview-history'],
    queryFn: async (): Promise<InterviewSessionRow[]> => {
      const res = await fetch('/api/ai/interview')
      if (!res.ok) throw new Error('Failed to fetch interview history')
      return res.json()
    },
  })
}

/**
 * Delete an interview session. Invalidates history query on success.
 */
export function useDeleteInterviewSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/ai/interview/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to delete session')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-history'] })
    },
  })
}
