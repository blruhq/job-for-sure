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
  | 'custom'

export const ALL_EDITOR_SECTIONS: EditorSectionId[] = [
  'basic', 'summary', 'skills', 'experience', 'education',
  'projects', 'certifications', 'languages', 'custom',
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
  sectionOrder: EditorSectionId[]
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
  savedSnapshot: string // JSON-stringified snapshot of last-saved state
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
  setProjects: (v: ResumeProject[]) => void
  setCertifications: (v: ResumeCertification[]) => void
  setLanguages: (v: ResumeLanguage[]) => void
  setCustomSections: (v: ResumeCustomSection[]) => void
  setSectionOrder: (v: EditorSectionId[]) => void
  setSectionVisibility: (v: Record<string, boolean>) => void
  toggleSectionVisibility: (id: EditorSectionId) => void

  // UI actions
  setSaveStatus: (v: 'idle' | 'saving' | 'saved') => void
  setSuggestions: (v: SectionKey[]) => void
  setSuggestionDismissed: (v: boolean) => void
  setShowAddSectionPicker: (v: boolean) => void
  setOptimizing: (v: boolean) => void

  // Bulk actions
  hydrate: (r: Resume) => void
  markSaved: () => void // Update savedSnapshot to match current state
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
        sectionOrder: [...ALL_EDITOR_SECTIONS],
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
        savedSnapshot: JSON.stringify(merged),

        // ── Setters ──

        setName: (v) => set((s) => { s.name = v }),
        setPersona: (v) => set((s) => { s.persona = v }),
        setRole: (v) => set((s) => { s.role = v }),
        setEmail: (v) => set((s) => { s.email = v }),
        setPhone: (v) => set((s) => { s.phone = v }),
        setLocation: (v) => set((s) => { s.location = v }),
        setGithub: (v) => set((s) => { s.github = v }),
        setSummary: (v) => set((s) => { s.summary = v }),
        setSkills: (v) => set((s) => { s.skills = v }),
        setExperience: (v) => set((s) => { s.experience = v }),
        setEducation: (v) => set((s) => { s.education = v }),
        setProjects: (v) => set((s) => { s.projects = v }),
        setCertifications: (v) => set((s) => { s.certifications = v }),
        setLanguages: (v) => set((s) => { s.languages = v }),
        setCustomSections: (v) => set((s) => { s.customSections = v }),
        setSectionOrder: (v) => set((s) => { s.sectionOrder = v }),
        setSectionVisibility: (v) => set((s) => { s.sectionVisibility = v }),
        toggleSectionVisibility: (id) => set((s) => {
          if (id === 'basic') return // basic is always visible
          s.sectionVisibility[id] = s.sectionVisibility[id] === false ? true : false
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
          s.customSections = r.customSections ?? []
          s.sectionOrder = (r.sectionOrder as EditorSectionId[]) ?? [...ALL_EDITOR_SECTIONS]
          s.sectionVisibility = r.sectionVisibility ?? {}
        }),

        markSaved: () => set((s) => {
          s.savedSnapshot = JSON.stringify({
            name: s.name,
            persona: s.persona,
            role: s.role,
            email: s.email,
            phone: s.phone,
            location: s.location,
            github: s.github,
            summary: s.summary,
            skills: s.skills,
            experience: s.experience,
            education: s.education,
            projects: s.projects,
            certifications: s.certifications,
            languages: s.languages,
            customSections: s.customSections,
            sectionOrder: s.sectionOrder,
            sectionVisibility: s.sectionVisibility,
          })
        }),

        hasUnsavedChanges: () => {
          const s = get()
          const current = JSON.stringify({
            name: s.name,
            persona: s.persona,
            role: s.role,
            email: s.email,
            phone: s.phone,
            location: s.location,
            github: s.github,
            summary: s.summary,
            skills: s.skills,
            experience: s.experience,
            education: s.education,
            projects: s.projects,
            certifications: s.certifications,
            languages: s.languages,
            customSections: s.customSections,
            sectionOrder: s.sectionOrder,
            sectionVisibility: s.sectionVisibility,
          })
          return current !== s.savedSnapshot
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
