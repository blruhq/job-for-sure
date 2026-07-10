'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Pipeline, PipelineJob, Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// CONTEXT TYPE
// ═══════════════════════════════════════════════════════════════
interface AppStore {
  // Resumes
  resumes: Resume[]
  activeResumeId: string | null
  activeResume: Resume | null
  setActiveResumeId: (id: string) => void
  addResume: (resume: Resume) => void
  updateResume: (id: string, updates: Partial<Resume>) => void
  getResume: (id: string) => Resume | undefined

  // Pipeline
  pipeline: Pipeline
  bookmarkJob: (job: PipelineJob) => void
  toggleBookmark: (key: string) => void
  isBookmarked: (key: string) => boolean
  moveJob: (jobKey: string, fromCol: keyof Pipeline, toCol: keyof Pipeline) => void
  removeJob: (jobKey: string, fromCol: keyof Pipeline) => void
  clearPipeline: () => void

  // Target company
  targetCompanyKey: string
  setTargetCompanyKey: (key: string) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Hydration
  hydrated: boolean
  loading: boolean
}

const AppCtx = createContext<AppStore | null>(null)

const EMPTY_PIPELINE: Pipeline = { bookmark: [], applied: [], interviewing: [], offers: [] }

// ═══════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  return res.json()
}

async function apiPost(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`)
  return res.json()
}

async function apiPatch(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.status}`)
  return res.json()
}

async function apiDelete(url: string): Promise<unknown> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`)
  return res.json()
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [activeResumeId, setActiveResumeIdState] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<Pipeline>(EMPTY_PIPELINE)
  const [targetCompanyKey, setTargetCompanyKey] = useState<string>('none')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarCollapsed(true)
    }
  }, [])

  // ── Hydrate from API ──
  useEffect(() => {
    async function load() {
      try {
        const [resumeList, pipelineData] = await Promise.all([
          apiGet<Array<{ id: string; data: string }>>('/api/resumes'),
          apiGet<Pipeline>('/api/pipeline').catch(() => EMPTY_PIPELINE),
        ])

        const parsed = resumeList.map((r) => {
          try { return { ...JSON.parse(r.data), id: r.id } as Resume }
          catch { return null }
        }).filter(Boolean) as Resume[]

        setResumes(parsed)
        if (parsed.length > 0) setActiveResumeIdState(parsed[0].id)
        setPipeline(pipelineData)
      } catch {
        // Not authenticated or no data — start empty
      } finally {
        setHydrated(true)
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Actions ──
  const setActiveResumeId = useCallback((id: string) => {
    setActiveResumeIdState(id)
  }, [])

  const addResume = useCallback((resume: Resume) => {
    apiPost('/api/resumes', { id: resume.id, data: resume }).catch(console.error)
    setResumes(prev => [...prev, resume])
    setActiveResumeIdState(resume.id)
  }, [])

  const updateResume = useCallback((id: string, updates: Partial<Resume>) => {
    setResumes(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } as Resume : r)
      const updated = next.find(r => r.id === id)
      if (updated) {
        apiPatch(`/api/resumes/${id}`, { data: updated }).catch(console.error)
      }
      return next
    })
  }, [])

  const getResume = useCallback((id: string) => resumes.find(r => r.id === id), [resumes])

  const activeResume = resumes.find(r => r.id === activeResumeId) ?? null

  // ── Pipeline actions ──
  const persistPipeline = useCallback((next: Pipeline) => {
    apiPost('/api/pipeline', next).catch(console.error)
  }, [])

  const bookmarkJob = useCallback((job: PipelineJob) => {
    setPipeline(prev => {
      if (prev.bookmark.some(j => j.key === job.key)) return prev
      const next = { ...prev, bookmark: [...prev.bookmark, job] }
      persistPipeline(next)
      return next
    })
  }, [persistPipeline])

  const toggleBookmark = useCallback((key: string) => {
    setPipeline(prev => {
      const exists = prev.bookmark.some(j => j.key === key)
      const next = exists
        ? { ...prev, bookmark: prev.bookmark.filter(j => j.key !== key) }
        : prev
      persistPipeline(next)
      return next
    })
  }, [persistPipeline])

  const isBookmarked = useCallback((key: string) => {
    return pipeline.bookmark.some(j => j.key === key)
  }, [pipeline])

  const moveJob = useCallback((jobKey: string, fromCol: keyof Pipeline, toCol: keyof Pipeline) => {
    setPipeline(prev => {
      const from = [...prev[fromCol]]
      const to = [...prev[toCol]]
      const idx = from.findIndex(j => j.key === jobKey)
      if (idx === -1) return prev
      const [job] = from.splice(idx, 1)
      job.time = toCol === 'applied' ? 'just now' : toCol === 'interviewing' ? 'scheduled' : toCol === 'offers' ? 'received' : 'saved'
      to.push(job)
      const next = { ...prev, [fromCol]: from, [toCol]: to }
      persistPipeline(next)
      return next
    })
  }, [persistPipeline])

  const removeJob = useCallback((jobKey: string, fromCol: keyof Pipeline) => {
    setPipeline(prev => {
      const arr = prev[fromCol].filter(j => j.key !== jobKey)
      const next = { ...prev, [fromCol]: arr }
      persistPipeline(next)
      return next
    })
  }, [persistPipeline])

  const clearPipeline = useCallback(() => {
    setPipeline(EMPTY_PIPELINE)
    persistPipeline(EMPTY_PIPELINE)
  }, [persistPipeline])

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])

  const value: AppStore = {
    resumes,
    activeResumeId,
    activeResume,
    setActiveResumeId,
    addResume,
    updateResume,
    getResume,
    pipeline,
    bookmarkJob,
    toggleBookmark,
    isBookmarked,
    moveJob,
    removeJob,
    clearPipeline,
    targetCompanyKey,
    setTargetCompanyKey,
    sidebarCollapsed,
    toggleSidebar,
    hydrated,
    loading,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
