import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from '~/lib/api-client'

export function useCoverLetters() {
  return useQuery({
    queryKey: ['cover-letters'],
    queryFn: ApiClient.getCoverLetters,
  })
}

export function useDeleteCoverLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.deleteCoverLetter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
    },
  })
}

export function useGenerateCoverLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.generateCoverLetter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
    },
  })
}
