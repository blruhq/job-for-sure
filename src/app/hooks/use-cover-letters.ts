import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from '~/lib/api-client'

export function useCoverLetters() {
  return useQuery({
    queryKey: ['cover-letters'],
    queryFn: ApiClient.getCoverLetters.bind(ApiClient),
  })
}

export function useDeleteCoverLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.deleteCoverLetter.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
    },
  })
}

export function useGenerateCoverLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.generateCoverLetter.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
    },
  })
}
