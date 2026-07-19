import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from '~/lib/api-client'
import type { PipelineJob, ApplicationBoard } from '~/types/resume'
import { notify } from '~/lib/toast'

type RawApplication = {
  id: string
  status?: string | null
  jobTitle?: string
  company?: string
  jobUrl?: string | null
  location?: string | null
  salary?: string | null
  logoUrl?: string | null
  color?: string | null
  level?: string | null
  matchScore?: number | null
  sourceKey?: string | null
  jobData?: Record<string, unknown> | null
  applicationId?: string | null
  notes?: string | null
  appliedAt?: string | null
  position?: number
  createdAt?: string
  resumeId?: string | null
}

function groupByStatus(apps: RawApplication[]): ApplicationBoard {
  const board: ApplicationBoard = {
    bookmark: [],
    applied: [],
    interviewing: [],
    offers: [],
    rejected: [],
  }

  const sorted = [...apps].sort((a, b) => {
    if ((a.position ?? 0) !== (b.position ?? 0)) return (a.position ?? 0) - (b.position ?? 0)
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  })

  const timeLabels: Record<string, string> = {
    bookmarked: 'saved',
    applied: 'just now',
    interviewing: 'scheduled',
    offered: 'received',
    rejected: 'rejected',
  }

  for (const app of sorted) {
    const job: PipelineJob = {
      key: app.sourceKey ?? '',
      applicationId: app.id,
      logo: app.logoUrl || '',
      color: app.color || '',
      company: app.company ?? '',
      title: app.jobTitle ?? '',
      loc: app.location || '',
      city: (app.jobData?.city as string) || undefined,
      district: (app.jobData?.district as string) || undefined,
      score: app.matchScore || 0,
      level: (app.level as 'high' | 'mid') || 'mid',
      time: timeLabels[app.status ?? ''] || 'saved',
      url: app.jobUrl || '',
      resume: app.resumeId || '',
      addedAt: app.createdAt ?? '',
      appliedAt: app.appliedAt ?? undefined,
      notes: app.notes || '',
      salary: app.salary || '',
      jobData: (app.jobData as PipelineJob['jobData']) || undefined,
    }

    let col: keyof ApplicationBoard = 'bookmark'
    if (app.status === 'bookmarked') col = 'bookmark'
    else if (app.status === 'offered') col = 'offers'
    else if (app.status && ['applied', 'interviewing', 'rejected'].includes(app.status)) {
      col = app.status as keyof ApplicationBoard
    }
    board[col].push(job)
  }

  return board
}

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const apps = await ApiClient.getApplications()
      return groupByStatus(apps)
    },
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.createApplication.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.deleteApplication.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: string; notes?: string; position?: number }) =>
      ApiClient.updateApplication(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useClearApplications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.clearApplications.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useReorderApplications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.reorderApplications.bind(ApiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useMoveApplication() {
  const queryClient = useQueryClient()
  const reorderMutation = useReorderApplications()
  // Snapshot captured by onMutate before optimistic update — needed by
  // mutationFn which runs AFTER onMutate already modified the cache.
  // Without this, mutationFn tries to find jobKey in a cache where it's
  // already been moved, returns early, and never calls the API.
  const preMutationSnapshot = useRef<ApplicationBoard | null>(null)

  return useMutation({
    mutationFn: async ({
      jobKey,
      fromCol,
      toCol,
      toIndex,
    }: {
      jobKey: string
      fromCol: keyof ApplicationBoard
      toCol: keyof ApplicationBoard
      toIndex?: number
    }) => {
      // Read the PRE-MUTATION snapshot, not the optimistically-updated cache
      const previous = preMutationSnapshot.current
      preMutationSnapshot.current = null
      if (!previous) return

      const from = [...previous[fromCol]]
      const to = fromCol === toCol ? from : [...previous[toCol]]

      const idx = from.findIndex((j) => j.key === jobKey)
      if (idx === -1) return

      const [job] = from.splice(idx, 1)

      const statusLabels: Record<string, string> = {
        bookmark: 'bookmarked',
        applied: 'applied',
        interviewing: 'interviewing',
        offers: 'offered',
        rejected: 'rejected',
      }
      const targetStatus = statusLabels[toCol]

      const target = typeof toIndex === 'number' ? toIndex : 0
      to.splice(target, 0, job)

      const updates: Array<{ id: string; status: string; position: number }> = []
      to.forEach((j, i) => {
        if (j.applicationId) {
          updates.push({ id: j.applicationId, status: targetStatus, position: i })
        }
      })
      if (fromCol !== toCol) {
        const sourceStatus = statusLabels[fromCol]
        from.forEach((j, i) => {
          if (j.applicationId) {
            updates.push({ id: j.applicationId, status: sourceStatus, position: i })
          }
        })
      }

      await reorderMutation.mutateAsync({ updates })
    },
    onMutate: async ({ jobKey, fromCol, toCol, toIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<ApplicationBoard>(['applications'])
      if (!previous) return { previous: null }

      // Save pre-mutation snapshot for mutationFn
      preMutationSnapshot.current = previous

      // Optimistic update
      const next = JSON.parse(JSON.stringify(previous)) as ApplicationBoard
      const from = next[fromCol]
      const to = next[toCol]

      const idx = from.findIndex((j) => j.key === jobKey)
      if (idx !== -1) {
        const [job] = from.splice(idx, 1)
        const target = typeof toIndex === 'number' ? toIndex : 0
        to.splice(target, 0, job)
        queryClient.setQueryData(['applications'], next)
      }

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['applications'], context.previous)
      }
      notify({ message: 'Failed to move job.', type: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
