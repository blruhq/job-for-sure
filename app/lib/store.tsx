'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Pipeline, PipelineJob, Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════
const RESUMES_KEY = 'jfs_resumes'
const ACTIVE_RESUME_KEY = 'jfs_active_resume_id'
const PIPELINE_KEY = 'jfs_pipeline'

const EMPTY_PIPELINE: Pipeline = { bookmark: [], applied: [], interviewing: [], offers: [] }

// ═══════════════════════════════════════════════════════════════
// CONTEXT TYPE
// ═══════════════════════════════════════════════════════════════
interface AppStore {
  // Resumes
  resumes: Resume[]
  activeResumeId: number | null
  activeResume: Resume | null
  setActiveResumeId: (id: number) => void
  addResume: (resume: Resume) => void
  updateResume: (id: number, updates: Partial<Resume>) => void
  getResume: (id: number) => Resume | undefined

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
}

const AppCtx = createContext<AppStore | null>(null)

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [activeResumeId, setActiveResumeIdState] = useState<number | null>(null)
  const [pipeline, setPipeline] = useState<Pipeline>(EMPTY_PIPELINE)
  const [targetCompanyKey, setTargetCompanyKey] = useState<string>('none')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ── Hydrate from localStorage ──
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RESUMES_KEY) || '[]')
      setResumes(r)
      const storedId = localStorage.getItem(ACTIVE_RESUME_KEY)
      setActiveResumeIdState(storedId ? parseInt(storedId) : null)
      const p = JSON.parse(localStorage.getItem(PIPELINE_KEY) || 'null')
      if (p) setPipeline(p)
    } catch { /* noop */ }
    setHydrated(true)
  }, [])

  // ── Persist resumes ──
  const persistResumes = useCallback((next: Resume[], nextId: number | null) => {
    localStorage.setItem(RESUMES_KEY, JSON.stringify(next))
    if (nextId !== null) localStorage.setItem(ACTIVE_RESUME_KEY, String(nextId))
    else localStorage.removeItem(ACTIVE_RESUME_KEY)
  }, [])

  // ── Persist pipeline ──
  const persistPipeline = useCallback((next: Pipeline) => {
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(next))
  }, [])

  // ── Actions ──
  const setActiveResumeId = useCallback((id: number) => {
    setActiveResumeIdState(id)
    setResumes(prev => {
      persistResumes(prev, id)
      return prev
    })
  }, [persistResumes])

  const addResume = useCallback((resume: Resume) => {
    setResumes(prev => {
      const next = [...prev, resume]
      setActiveResumeIdState(resume.id)
      persistResumes(next, resume.id)
      return next
    })
  }, [persistResumes])

  const updateResume = useCallback((id: number, updates: Partial<Resume>) => {
    setResumes(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...updates } : r)
      persistResumes(next, activeResumeId)
      return next
    })
  }, [persistResumes, activeResumeId])

  const getResume = useCallback((id: number) => resumes.find(r => r.id === id), [resumes])

  const activeResume = resumes.find(r => r.id === activeResumeId) ?? null

  // ── Pipeline actions ──
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
        : prev // only toggle from bookmark col; adding is via bookmarkJob
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
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
