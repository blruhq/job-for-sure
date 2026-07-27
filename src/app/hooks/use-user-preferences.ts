import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface UserPreferences {
  emailNotifications: boolean
  weeklyDigest: boolean
  marketingEmails: boolean
  homeLocation: string | null
}

/**
 * Fetch user preferences via TanStack Query.
 * Replaces raw fetch('/api/user/preferences') calls in job-detail-panel and settings page.
 * staleTime: 5 minutes — preferences change rarely.
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences | null> => {
      const res = await fetch('/api/user/preferences')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Update user preferences. Invalidates the query cache on success.
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<UserPreferences>): Promise<UserPreferences | null> => {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to update preferences')
      return res.ok ? res.json() : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })
}
