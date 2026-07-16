import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from '~/lib/api-client'
import type { Resume } from '~/types/resume'

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const data = await ApiClient.getResumes()
      return data.map((r) => ({ ...r.data, id: r.id } as Resume))
    },
  })
}

export function useCreateResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.createResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useUpdateResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Resume>; isBase?: boolean }) =>
      ApiClient.updateResume(id, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useDeleteResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}
