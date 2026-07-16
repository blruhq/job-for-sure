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

type CreateResumePayload = { id: string; data: Resume; isBase?: boolean }

export function useCreateResume() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, CreateResumePayload, { previous: Resume[] | undefined }>({
    mutationFn: ApiClient.createResume.bind(ApiClient) as (payload: CreateResumePayload) => Promise<void>,
    onMutate: async (payload) => {
      // Cancel any in-flight refetches so they don't clobber our optimistic update
      await queryClient.cancelQueries({ queryKey: ['resumes'] })
      // Snapshot previous state for rollback on error
      const previous = queryClient.getQueryData<Resume[]>(['resumes'])
      // Optimistically add the new resume to the cache
      queryClient.setQueryData<Resume[]>(['resumes'], (old) => {
        const newResume = { ...payload.data, id: payload.id } as Resume
        return old ? [newResume, ...old] : [newResume]
      })
      return { previous }
    },
    onError: (_err, _payload, context) => {
      // Rollback to the pre-mutation state
      if (context?.previous) {
        queryClient.setQueryData(['resumes'], context.previous)
      }
    },
    onSettled: () => {
      // Refetch to ensure server consistency
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
    mutationFn: ApiClient.deleteResume.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}
