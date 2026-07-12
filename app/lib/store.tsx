'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ApplicationBoard, PipelineJob, Resume } from '~/types/resume'
import { notify } from '~/lib/toast'

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
  deleteResume: (id: string) => Promise<void>
  getResume: (id: string) => Resume | undefined

  // Applications
  applications: ApplicationBoard
  bookmarkJob: (job: PipelineJob) => void
  toggleBookmark: (key: string) => void
  isBookmarked: (key: string) => boolean
  moveJob: (jobKey: string, fromCol: keyof ApplicationBoard, toCol: keyof ApplicationBoard, toIndex?: number) => void
  removeJob: (jobKey: string, fromCol: keyof ApplicationBoard) => void
  clearApplications: () => void

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

const EMPTY_APPLICATIONS: ApplicationBoard = { bookmark: [], applied: [], interviewing: [], offers: [] }

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
  const [applications, setApplications] = useState<ApplicationBoard>(EMPTY_APPLICATIONS)
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
        const [resumeList, boardData] = await Promise.all([
          apiGet<Array<{ id: string; data: string }>>('/api/resumes'),
          apiGet<ApplicationBoard>('/api/applications').catch(() => EMPTY_APPLICATIONS),
        ])

        const parsed = resumeList.map((r) => {
          try {
            const dataObj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
            return { ...dataObj, id: r.id } as Resume
          }
          catch { return null }
        }).filter(Boolean) as Resume[]

        setResumes(parsed)
        if (parsed.length > 0) setActiveResumeIdState(parsed[0].id)
        setApplications(boardData)
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
    setResumes(prev => [...prev, resume])
    setActiveResumeIdState(resume.id)
    apiPost('/api/resumes', { id: resume.id, data: resume }).catch((err) => {
      console.error(err)
      setResumes(curr => curr.filter(r => r.id !== resume.id))
      notify({ message: 'Failed to save resume. Changes rolled back.', type: 'error' })
    })
  }, [])

  const updateResume = useCallback((id: string, updates: Partial<Resume>) => {
    setResumes(prev => {
      const match = prev.find(r => r.id === id)
      if (!match) return prev
      const updated = { ...match, ...updates } as Resume
      apiPatch(`/api/resumes/${id}`, { data: updated }).catch((err) => {
        console.error(err)
        setResumes(curr => curr.map(r => r.id === id ? match : r))
        notify({ message: 'Failed to update resume. Changes rolled back.', type: 'error' })
      })
      return prev.map(r => r.id === id ? updated : r)
    })
  }, [])

  const deleteResume = useCallback(async (id: string) => {
    // Capture current state BEFORE mutation (no side effects inside updater)
    const oldResumes = resumes
    const oldActiveId = activeResumeId

    // Compute next state synchronously
    const next = resumes.filter(r => r.id !== id)
    setResumes(next)

    // Update active ID based on computed state
    if (activeResumeId === id) {
      setActiveResumeIdState(next.length > 0 ? next[0].id : null)
    }

    try {
      await apiDelete(`/api/resumes/${id}`)
    } catch (err) {
      console.error(err)
      setResumes(oldResumes)
      if (oldActiveId !== null) setActiveResumeIdState(oldActiveId)
      notify({ message: 'Failed to delete resume. Changes rolled back.', type: 'error' })
    }
  }, [resumes, activeResumeId])

  const getResume = useCallback((id: string) => resumes.find(r => r.id === id), [resumes])

  const activeResume = resumes.find(r => r.id === activeResumeId) ?? null

  // ── Applications actions with Rollback ──
  const updateApplicationsAndPersist = useCallback((updater: (prev: ApplicationBoard) => ApplicationBoard) => {
    let oldVal: ApplicationBoard | null = null
    setApplications(prev => {
      oldVal = prev
      const next = updater(prev)
      apiPost('/api/applications', next).catch((err) => {
        console.error(err)
        if (oldVal) setApplications(oldVal)
        notify({ message: 'Failed to update application board. Changes rolled back.', type: 'error' })
      })
      return next
    })
  }, [])

  const bookmarkJob = useCallback((job: PipelineJob) => {
    updateApplicationsAndPersist(prev => {
      if (prev.bookmark.some(j => j.key === job.key)) return prev
      return { ...prev, bookmark: [...prev.bookmark, job] }
    })
  }, [updateApplicationsAndPersist])

  const toggleBookmark = useCallback((key: string) => {
    updateApplicationsAndPersist(prev => {
      const exists = prev.bookmark.some(j => j.key === key)
      return exists
        ? { ...prev, bookmark: prev.bookmark.filter(j => j.key !== key) }
        : prev
    })
  }, [updateApplicationsAndPersist])

  const isBookmarked = useCallback((key: string) => {
    return applications.bookmark.some(j => j.key === key)
  }, [applications])

  const moveJob = useCallback((jobKey: string, fromCol: keyof ApplicationBoard, toCol: keyof ApplicationBoard, toIndex?: number) => {
    updateApplicationsAndPersist(prev => {
      // Same column — reorder within
      if (fromCol === toCol) {
        const items = [...prev[fromCol]]
        const idx = items.findIndex(j => j.key === jobKey)
        if (idx === -1) return prev
        const [job] = items.splice(idx, 1)
        const target = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= items.length
          ? toIndex
          : 0
        items.splice(target, 0, job)
        return { ...prev, [fromCol]: items }
      }

      // Cross-column move
      const from = [...prev[fromCol]]
      const to = [...prev[toCol]]
      const idx = from.findIndex(j => j.key === jobKey)
      if (idx === -1) return prev
      const [job] = from.splice(idx, 1)
      job.time = toCol === 'applied' ? 'just now' : toCol === 'interviewing' ? 'scheduled' : toCol === 'offers' ? 'received' : 'saved'

      if (typeof toIndex === 'number' && toIndex >= 0 && toIndex <= to.length) {
        to.splice(toIndex, 0, job)
      } else {
        to.unshift(job)
      }

      return { ...prev, [fromCol]: from, [toCol]: to }
    })
  }, [updateApplicationsAndPersist])

  const removeJob = useCallback((jobKey: string, fromCol: keyof ApplicationBoard) => {
    updateApplicationsAndPersist(prev => {
      const arr = prev[fromCol].filter(j => j.key !== jobKey)
      return { ...prev, [fromCol]: arr }
    })
  }, [updateApplicationsAndPersist])

  const clearApplications = useCallback(() => {
    updateApplicationsAndPersist(() => EMPTY_APPLICATIONS)
  }, [updateApplicationsAndPersist])

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])

  const value = useMemo<AppStore>(() => ({
    resumes,
    activeResumeId,
    activeResume,
    setActiveResumeId,
    addResume,
    updateResume,
    deleteResume,
    getResume,
    applications,
    bookmarkJob,
    toggleBookmark,
    isBookmarked,
    moveJob,
    removeJob,
    clearApplications,
    targetCompanyKey,
    setTargetCompanyKey,
    sidebarCollapsed,
    toggleSidebar,
    hydrated,
    loading,
  }), [
    resumes, activeResumeId, activeResume, applications,
    hydrated, loading, targetCompanyKey, sidebarCollapsed,
    setActiveResumeId, addResume, updateResume, deleteResume,
    getResume, bookmarkJob, toggleBookmark, isBookmarked,
    moveJob, removeJob, clearApplications, setTargetCompanyKey,
    toggleSidebar,
  ])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
