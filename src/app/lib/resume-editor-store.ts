'use client'

import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import { useStore } from 'zustand'
import { useRef, useEffect } from 'react'
import type {
  Resume,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
  ResumeCertification,
  ResumeLanguage,
  ResumeCustomSection,
} from '~/types/resume'
import { DEFAULT_SECTION_ORDER } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// Editor section identifiers — shared with component
// ═══════════════════════════════════════════════════════════════

export type EditorSectionId =
  | 'basic'
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'languages'

/** SectionOrderId is EditorSectionId, custom section reference (cs-{id}), or legacy 'custom' */
export type SectionOrderId = EditorSectionId | `cs-${string}` | 'custom'

export const ALL_EDITOR_SECTIONS: EditorSectionId[] = [
  'basic', 'summary', 'skills', 'experience', 'education',
  'projects', 'certifications', 'languages',
]

export type SectionKey = 'projects' | 'certifications' | 'languages' | 'custom'

// ═══════════════════════════════════════════════════════════════
// The subset that gets saved to the API
// ═══════════════════════════════════════════════════════════════

export interface ResumeSavePayload {
  name: string
  persona: string
  role: string
  email: string
  phone: string
  location: string
  github: string
  summary: string
  skills: string[]
  experience: ResumeExperience[]
  education: ResumeEducation[]
  projects: ResumeProject[]
  certifications: ResumeCertification[]
  languages: ResumeLanguage[]
  customSections: ResumeCustomSection[]
  sectionOrder: SectionOrderId[]
  sectionVisibility: Record<string, boolean>
}

// ═══════════════════════════════════════════════════════════════
// Full editor state + actions
// ═══════════════════════════════════════════════════════════════

export interface ResumeEditorState extends ResumeSavePayload {
  saveStatus: 'idle' | 'saving' | 'saved'
  suggestions: SectionKey[]
  suggestionDismissed: boolean
  showAddSectionPicker: boolean
  optimizing: boolean
  isDirty: boolean // true when user has made changes since last save
}

export interface ResumeEditorActions {
  // Per-field setters
  setName: (v: string) => void
  setPersona: (v: string) => void
  setRole: (v: string) => void
  setEmail: (v: string) => void
  setPhone: (v: string) => void
  setLocation: (v: string) => void
  setGithub: (v: string) => void
  setSummary: (v: string) => void
  setSkills: (v: string[]) => void
  setExperience: (v: ResumeExperience[]) => void
  setEducation: (v: ResumeEducation[]) => void
  setProjects: (v: ResumeProject[] | ((prev: ResumeProject[]) => ResumeProject[])) => void
  setCertifications: (v: ResumeCertification[] | ((prev: ResumeCertification[]) => ResumeCertification[])) => void
  setLanguages: (v: ResumeLanguage[] | ((prev: ResumeLanguage[]) => ResumeLanguage[])) => void
  setCustomSections: (v: ResumeCustomSection[] | ((prev: ResumeCustomSection[]) => ResumeCustomSection[])) => void
  setSectionOrder: (v: SectionOrderId[] | ((prev: SectionOrderId[]) => SectionOrderId[])) => void
  setSectionVisibility: (v: Record<string, boolean>) => void
  toggleSectionVisibility: (id: SectionOrderId) => void

  // UI actions
  setSaveStatus: (v: 'idle' | 'saving' | 'saved') => void
  setSuggestions: (v: SectionKey[]) => void
  setSuggestionDismissed: (v: boolean) => void
  setShowAddSectionPicker: (v: boolean) => void
  setOptimizing: (v: boolean) => void

  // Bulk actions
  hydrate: (r: Resume) => void
  markSaved: () => void // Clear isDirty after a successful save
  hasUnsavedChanges: () => boolean
}

export type ResumeEditorStore = ResumeEditorState & ResumeEditorActions

// ═══════════════════════════════════════════════════════════════
// Store factory
// ═══════════════════════════════════════════════════════════════

export function createResumeEditorStore(initial?: Partial<ResumeSavePayload> | Partial<Resume>) {
  return createStore<ResumeEditorStore>()(
    immer((set, get) => {
      const defaults: ResumeSavePayload = {
        name: '',
        persona: '',
        role: '',
        email: '',
        phone: '',
        location: '',
        github: '',
        summary: '',
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        languages: [],
        customSections: [],
        sectionOrder: [...ALL_EDITOR_SECTIONS] as SectionOrderId[],
        sectionVisibility: {},
      }

      const merged = { ...defaults, ...(initial as Partial<ResumeSavePayload>) }

      return {
        ...merged,
        saveStatus: 'idle',
        suggestions: [],
        suggestionDismissed: false,
        showAddSectionPicker: false,
        optimizing: false,
        isDirty: false,

        // ── Setters ──

        setName: (v) => set((s) => { s.name = v; s.isDirty = true }),
        setPersona: (v) => set((s) => { s.persona = v; s.isDirty = true }),
        setRole: (v) => set((s) => { s.role = v; s.isDirty = true }),
        setEmail: (v) => set((s) => { s.email = v; s.isDirty = true }),
        setPhone: (v) => set((s) => { s.phone = v; s.isDirty = true }),
        setLocation: (v) => set((s) => { s.location = v; s.isDirty = true }),
        setGithub: (v) => set((s) => { s.github = v; s.isDirty = true }),
        setSummary: (v) => set((s) => { s.summary = v; s.isDirty = true }),
        setSkills: (v) => set((s) => { s.skills = v; s.isDirty = true }),
        setExperience: (v) => set((s) => { s.experience = v; s.isDirty = true }),
        setEducation: (v) => set((s) => { s.education = v; s.isDirty = true }),
        setProjects: (v) => set((s) => { s.projects = typeof v === 'function' ? v(s.projects) : v; s.isDirty = true }),
        setCertifications: (v) => set((s) => { s.certifications = typeof v === 'function' ? v(s.certifications) : v; s.isDirty = true }),
        setLanguages: (v) => set((s) => { s.languages = typeof v === 'function' ? v(s.languages) : v; s.isDirty = true }),
        setCustomSections: (v) => set((s) => { s.customSections = typeof v === 'function' ? v(s.customSections) : v; s.isDirty = true }),
        setSectionOrder: (v) => set((s) => { s.sectionOrder = typeof v === 'function' ? v(s.sectionOrder) : v; s.isDirty = true }),
        setSectionVisibility: (v) => set((s) => { s.sectionVisibility = v; s.isDirty = true }),
        toggleSectionVisibility: (id) => set((s) => {
          if (id === 'basic') return // basic is always visible
          s.sectionVisibility[id] = s.sectionVisibility[id] === false ? true : false
          s.isDirty = true
        }),
        setSaveStatus: (v) => set((s) => { s.saveStatus = v }),
        setSuggestions: (v) => set((s) => { s.suggestions = v }),
        setSuggestionDismissed: (v) => set((s) => { s.suggestionDismissed = v }),
        setShowAddSectionPicker: (v) => set((s) => { s.showAddSectionPicker = v }),
        setOptimizing: (v) => set((s) => { s.optimizing = v }),

        hydrate: (r) => set((s) => {
          s.name = r.name ?? ''
          s.persona = r.persona ?? ''
          s.role = r.role ?? ''
          s.email = r.email ?? ''
          s.phone = r.phone ?? ''
          s.location = r.location ?? ''
          s.github = r.github ?? ''
          s.summary = r.summary ?? ''
          s.skills = r.skills ?? []
          s.experience = r.experience ?? []
          s.education = r.education ?? []
          s.projects = r.projects ?? []
          s.certifications = r.certifications ?? []
          s.languages = r.languages ?? []

          // ── Custom sections: auto-assign IDs if missing, expand sectionOrder ──
          const rawSections = r.customSections ?? []
          const sectionsWithIds: ResumeCustomSection[] = rawSections.map((cs) => ({
            ...cs,
            id: cs.id || `cs_${crypto.randomUUID?.()?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`,
          }))
          s.customSections = sectionsWithIds

          // Build sectionOrder from resume or default
          const rawOrder = (r.sectionOrder as string[]) ?? Array.from(ALL_EDITOR_SECTIONS)
          const existingCsIds = new Set(sectionsWithIds.map((cs) => `cs-${cs.id}`))
          // Filter out legacy 'custom' and stale cs-{id} entries
          const cleanOrder = rawOrder.filter((id) => id !== 'custom' && (!id.startsWith('cs-') || existingCsIds.has(id)))
          // Append any custom sections not already in the order
          for (const csId of existingCsIds) {
            if (!cleanOrder.includes(csId)) {
              cleanOrder.push(csId)
            }
          }
          s.sectionOrder = cleanOrder as SectionOrderId[]

          s.sectionVisibility = r.sectionVisibility ?? {}
          s.isDirty = false
        }),

        markSaved: () => set((s) => {
          s.isDirty = false
        }),

        hasUnsavedChanges: () => {
          return get().isDirty
        },
      }
    }),
  )
}

// ═══════════════════════════════════════════════════════════════
// React hook: creates/reuses the store, hydrates on resume change
// ═══════════════════════════════════════════════════════════════

export function useResumeEditor(resumeId: string, resume?: Resume | null) {
  const storeRef = useRef<ReturnType<typeof createResumeEditorStore> | null>(null)

  // Create store once per resume ID
  if (storeRef.current === null) {
    storeRef.current = createResumeEditorStore(resume ?? undefined)
  }

  // Hydrate when resume data changes (initial load, variant switch)
  useEffect(() => {
    if (resume) {
      storeRef.current?.getState().hydrate(resume)
    }
  }, [resume?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear store on unmount
  useEffect(() => {
    return () => {
      storeRef.current = null
    }
  }, [resumeId])

  return storeRef.current
}

// ═══════════════════════════════════════════════════════════════
// Utility: typed selector hook for the editor store
// ═══════════════════════════════════════════════════════════════

export function useEditorStore<T>(
  store: ReturnType<typeof createResumeEditorStore> | null,
  selector: (state: ResumeEditorStore) => T,
): T {
  // If no store, return a default. This shouldn't happen in practice.
  return useStore(
    store ?? createResumeEditorStore(),
    selector as any,
  )
}
