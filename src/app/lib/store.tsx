'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ApplicationBoard, PipelineJob, Resume, PendingTailor } from '~/types/resume'
import { notify } from '~/lib/toast'
import { EMPTY_APPLICATIONS } from '~/lib/constants'

// ── DB application record shape (from GET /api/applications) ──
interface ApplicationRecord {
  id: string
  sourceKey: string
  company: string
  jobTitle: string
  jobUrl: string | null
  location: string | null
  salary: string | null
  logoUrl: string | null
  color: string | null
  level: string | null
  status: string
  position: number
  matchScore: number | null
  resumeId: string | null
  notes: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

function columnToStatus(col: keyof ApplicationBoard): 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected' {
  if (col === 'bookmark') return 'bookmarked'
  if (col === 'offers') return 'offered'
  return col as 'applied' | 'interviewing' | 'rejected'
}

function statusToColumn(status: string): keyof ApplicationBoard | null {
  if (status === 'bookmarked') return 'bookmark'
  if (status === 'offered') return 'offers'
  if (['applied', 'interviewing', 'rejected'].includes(status)) {
    return status as keyof ApplicationBoard
  }
  return null
}

function mapAppToJob(app: ApplicationRecord): PipelineJob {
  const timeLabels: Record<string, string> = {
    bookmarked: 'saved',
    applied: 'just now',
    interviewing: 'scheduled',
    offered: 'received',
    rejected: 'rejected',
  }
  return {
    key: app.sourceKey,
    applicationId: app.id,
    logo: app.logoUrl || '',
    color: app.color || '',
    company: app.company,
    title: app.jobTitle,
    loc: app.location || '',
    score: app.matchScore || 0,
    level: (app.level as 'high' | 'mid') || 'mid',
    time: timeLabels[app.status] || 'saved',
    url: app.jobUrl || '',
    resume: app.resumeId || '',
    addedAt: app.createdAt,
  }
}

function groupByStatus(apps: ApplicationRecord[]): ApplicationBoard {
  const board: ApplicationBoard = {
    bookmark: [],
    applied: [],
    interviewing: [],
    offers: [],
    rejected: [],
  }
  const sorted = [...apps].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  for (const app of sorted) {
    const job = mapAppToJob(app)
    const col = statusToColumn(app.status)
    if (col && col in board) board[col].push(job)
  }
  return board
}

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

  // Tailor review mode
  pendingTailor: PendingTailor | null
  setPendingTailor: (pending: PendingTailor | null) => void
  toggleAcceptedChange: (changeId: string) => void
  addVariantResume: (resume: Resume) => void
}

const AppCtx = createContext<AppStore | null>(null)

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
  const [pendingTailor, setPendingTailorState] = useState<PendingTailor | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarCollapsed(true)
    }
  }, [])

  // ── Hydrate from API ──
  useEffect(() => {
    async function load() {
      try {
        const [resumeList, appList] = await Promise.all([
          apiGet<Array<{ id: string; data: Resume }>>('/api/resumes'),
          apiGet<ApplicationRecord[]>('/api/applications').catch(() => []),
        ])

        const parsed = resumeList
          .map((r) => {
            try {
              const dataObj = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
              return { ...dataObj, id: r.id } as Resume
            } catch (err) {
              console.error(`[store] Failed to parse resume data for id ${r.id}:`, err)
              return null
            }
          })
          .filter((r): r is Resume => r !== null)
        setResumes(parsed)
        if (parsed.length > 0) setActiveResumeIdState(parsed[0].id)
        setApplications(groupByStatus(appList))
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
    if (!hydratedRef.current) return
    setResumes(prev => [...prev, resume])
    setActiveResumeIdState(resume.id)
    apiPost('/api/resumes', { id: resume.id, data: resume }).catch((err) => {
      console.error(err)
      setResumes(curr => curr.filter(r => r.id !== resume.id))
      notify({ message: 'Failed to save resume. Changes rolled back.', type: 'error' })
    })
  }, [])

  const updateResume = useCallback((id: string, updates: Partial<Resume>) => {
    const match = resumesRef.current.find(r => r.id === id)
    if (!match) return
    const updated = { ...match, ...updates } as Resume
    setResumes(prev => prev.map(r => r.id === id ? updated : r))
    apiPatch(`/api/resumes/${id}`, { data: updated }).catch((err) => {
      console.error(err)
      setResumes(prev => prev.map(r => r.id === id ? match : r))
      notify({ message: 'Failed to update resume. Changes rolled back.', type: 'error' })
    })
  }, [])

  const deleteResume = useCallback(async (id: string) => {
    const oldResumes = resumesRef.current
    const oldActiveId = activeResumeId

    const next = oldResumes.filter(r => r.id !== id)
    setResumes(next)

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
  }, [activeResumeId])

  const getResume = useCallback((id: string) => resumes.find(r => r.id === id), [resumes])

  const activeResume = resumes.find(r => r.id === activeResumeId) ?? null

  // ── Ref mirror of resumes for rollback without side effects in updater ──
  const resumesRef = useRef(resumes)
  resumesRef.current = resumes

  // ── Hydration ref — prevents mutations before initial load completes ──
  const hydratedRef = useRef(false)
  hydratedRef.current = hydrated

  // ── Ref mirror of applications for rollback without side effects in updater ──
  const applicationsRef = useRef(applications)
  applicationsRef.current = applications

  const bookmarkJob = useCallback((job: PipelineJob) => {
    if (applicationsRef.current.bookmark.some(j => j.key === job.key)) return

    const prev = applicationsRef.current
    const optimisticJob: PipelineJob = { ...job, time: 'saved', addedAt: new Date().toISOString() }
    setApplications(prevApps => ({
      ...prevApps,
      bookmark: [...prevApps.bookmark, optimisticJob],
    }))

    apiPost('/api/applications', {
      sourceKey: job.key,
      company: job.company,
      jobTitle: job.title,
      jobUrl: job.url || undefined,
      location: job.loc || undefined,
      logoUrl: job.logo || undefined,
      color: job.color || undefined,
      level: job.level || undefined,
      matchScore: job.score || undefined,
      resumeId: job.resume || undefined,
      status: 'bookmarked',
    }).then((res) => {
      const created = res as { id: string }
      setApplications(prevApps => ({
        ...prevApps,
        bookmark: prevApps.bookmark.map(j =>
          j.key === job.key ? { ...j, applicationId: created.id } : j
        ),
      }))
    }).catch(() => {
      setApplications(prev)
      notify({ message: 'Failed to bookmark job.', type: 'error' })
    })
  }, [])

  const toggleBookmark = useCallback((key: string) => {
    const existing = applicationsRef.current.bookmark.find(j => j.key === key)
    if (!existing) return

    const prev = applicationsRef.current
    setApplications(prevApps => ({
      ...prevApps,
      bookmark: prevApps.bookmark.filter(j => j.key !== key),
    }))

    if (existing.applicationId) {
      apiDelete(`/api/applications/${existing.applicationId}`).catch(() => {
        setApplications(prev)
        notify({ message: 'Failed to remove bookmark.', type: 'error' })
      })
    }
  }, [])

  const isBookmarked = useCallback((key: string) => {
    return applications.bookmark.some(j => j.key === key)
  }, [applications])

  const moveJob = useCallback((jobKey: string, fromCol: keyof ApplicationBoard, toCol: keyof ApplicationBoard, toIndex?: number) => {
    const prev = applicationsRef.current
    const from = [...prev[fromCol]]
    const to = fromCol === toCol ? from : [...prev[toCol]]

    const idx = from.findIndex(j => j.key === jobKey)
    if (idx === -1) return

    const [job] = from.splice(idx, 1)

    if (toCol === 'applied') job.time = 'just now'
    else if (toCol === 'interviewing') job.time = 'scheduled'
    else if (toCol === 'offers') job.time = 'received'
    else if (toCol === 'rejected') job.time = 'rejected'
    else job.time = 'saved'

    const target = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= to.length
      ? toIndex
      : 0
    to.splice(target, 0, job)

    const next = fromCol === toCol
      ? { ...prev, [fromCol]: to }
      : { ...prev, [fromCol]: from, [toCol]: to }
    setApplications(next)

    const updates: Array<{ id: string; status: string; position: number }> = []
    to.forEach((j, i) => {
      if (j.applicationId) updates.push({ id: j.applicationId, status: columnToStatus(toCol), position: i })
    })
    if (fromCol !== toCol) {
      from.forEach((j, i) => {
        if (j.applicationId) updates.push({ id: j.applicationId, status: columnToStatus(fromCol), position: i })
      })
    }

    if (updates.length > 0) {
      apiPost('/api/applications/reorder', { updates }).catch(() => {
        setApplications(prev)
        notify({ message: 'Failed to move application.', type: 'error' })
      })
    }
  }, [])

  const removeJob = useCallback((jobKey: string, fromCol: keyof ApplicationBoard) => {
    const prev = applicationsRef.current
    const job = prev[fromCol].find(j => j.key === jobKey)
    if (!job) return

    setApplications(prevApps => ({
      ...prevApps,
      [fromCol]: prevApps[fromCol].filter(j => j.key !== jobKey),
    }))

    if (job.applicationId) {
      apiDelete(`/api/applications/${job.applicationId}`).catch(() => {
        setApplications(prev)
        notify({ message: 'Failed to remove application.', type: 'error' })
      })
    }
  }, [])

  const clearApplications = useCallback(() => {
    const prev = applicationsRef.current
    setApplications(EMPTY_APPLICATIONS)
    apiDelete('/api/applications').catch(() => {
      setApplications(prev)
      notify({ message: 'Failed to clear applications.', type: 'error' })
    })
  }, [])

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])

  const setPendingTailor = useCallback((pending: PendingTailor | null) => {
    setPendingTailorState(pending)
  }, [])

  const toggleAcceptedChange = useCallback((changeId: string) => {
    setPendingTailorState(prev => {
      if (!prev) return prev
      const next = new Set(prev.accepted)
      if (next.has(changeId)) next.delete(changeId)
      else next.add(changeId)
      return { ...prev, accepted: next }
    })
  }, [])

  const addVariantResume = useCallback((resume: Resume) => {
    if (!hydratedRef.current) return
    setResumes(prev => [...prev, resume])
    setActiveResumeIdState(resume.id)
    apiPost('/api/resumes', { id: resume.id, data: resume, isBase: false }).catch((err) => {
      console.error(err)
      setResumes(curr => curr.filter(r => r.id !== resume.id))
      notify({ message: 'Failed to save variant. Changes rolled back.', type: 'error' })
    })
  }, [])

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
    pendingTailor,
    setPendingTailor,
    toggleAcceptedChange,
    addVariantResume,
  }), [
    resumes, activeResumeId, activeResume, applications,
    hydrated, loading, targetCompanyKey, sidebarCollapsed,
    setActiveResumeId, addResume, updateResume, deleteResume,
    getResume, bookmarkJob, toggleBookmark, isBookmarked,
    moveJob, removeJob, clearApplications, setTargetCompanyKey,
    toggleSidebar,
    pendingTailor, setPendingTailor, toggleAcceptedChange, addVariantResume,
  ])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
