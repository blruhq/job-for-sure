'use client'

import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from '~/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Wand2, Trash2, Plus, X, PlusCircle, Lightbulb, GripVertical, ChevronDown, ChevronUp, Sparkles, Eye, EyeOff } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '~/lib/utils'
import { useResumes, useCreateResume, useUpdateResume, useDeleteResume } from '~/hooks/use-resumes'
import { useUIStore } from '~/hooks/use-ui'
import { notify } from '~/lib/toast'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { ResumeCopilot } from '~/components/resume/resume-copilot'
import { JobSearchPanel } from '~/components/resume/job-search-panel'
import type { Resume, ResumeEducation, ResumeProject, ResumeExperience, ResumeCertification, ResumeLanguage, ResumeCustomSection } from '~/types/resume'
import { TemplateGallery } from '~/components/resume/templates/template-gallery'
import { DEFAULT_TEMPLATE, getTemplateMeta } from '~/components/resume/templates/registry'
const ResumePreview = dynamic(() => import('~/components/resume/resume-preview').then(m => ({ default: m.ResumePreview })), { ssr: false })
import { TailorReviewPanel } from '~/components/resume/tailor-review-panel'
import { ResizableGroup, ResizablePanel, ResizableHandle, useDefaultLayout } from '~/components/ui/resizable'
import { useResumeEditor, type SectionOrderId, type SectionKey } from '~/lib/resume-editor-store'
import { useStore } from 'zustand'

// ── Helpers ──

const SECTION_LABELS: Record<SectionKey, string> = {
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  custom: 'Custom Section',
}

const SECTION_ICONS: Record<SectionKey, string> = {
  projects: '📦',
  certifications: '📜',
  languages: '🌐',
  custom: '✍️',
}

function detectSectionSuggestions(resume: { summary?: string; skills?: string[]; experience?: ResumeExperience[] }): SectionKey[] {
  const text = [
    resume.summary ?? '',
    ...(resume.skills ?? []),
    ...(resume.experience ?? []).flatMap(e => [e.company, e.role]),
  ].join(' ').toLowerCase()

  const suggestions: SectionKey[] = []
  if (/finance|accounting|banking|investment|cfa|cpa|pmp|aws\s+certified|google\s+certified|audit|compliance|risk/i.test(text))
    suggestions.push('certifications')
  if (/bilingual|multilingual|language|fluent|native|thai|chinese|japanese|korean|french|german|spanish/i.test(text) && !/language/i.test(text))
    suggestions.push('languages')
  return suggestions
}

// ── Sub-components ──

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = useCallback(() => {
    const val = input.trim()
    if (val && !tags.includes(val)) {
      onChange([...tags, val])
    }
    setInput('')
    inputRef.current?.focus()
  }, [input, tags, onChange])

  return (
    <div className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-xs neuro-inset px-3 py-2 text-sm">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-0.5 rounded-xs bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {tag}
          <Button variant="ghost" size="icon" onClick={() => onChange(tags.filter((t) => t !== tag))} className="ml-0.5 h-4 w-4 rounded-full p-0 hover:bg-primary/20">
            <X size={10} />
          </Button>
        </span>
      ))}
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
          }
          if (e.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? (placeholder || 'Type and press Enter') : ''}
        className="min-w-[80px] flex-1 border-none bg-transparent text-sm shadow-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      className="relative rounded-xs neuro-inset p-3"
    >
      {children}
      <Button
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 h-auto w-auto -translate-y-1/2 cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </Button>
    </div>
  )
}

function EditableList<T>({
  items,
  onChange,
  renderItem,
  createNew,
  label,
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, index: number, update: (item: T) => void) => React.ReactNode
  createNew: () => T
  label: string
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // Generate stable IDs for sortable items using a ref
  const itemIdsRef = useRef<string[]>([])
  if (itemIdsRef.current.length !== items.length) {
    while (itemIdsRef.current.length < items.length) {
      itemIdsRef.current.push(`${label}-${crypto.randomUUID()}`)
    }
    while (itemIdsRef.current.length > items.length) {
      itemIdsRef.current.pop()
    }
  }
  const itemIds = itemIdsRef.current

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIndex = itemIds.indexOf(active.id as string)
    const newIndex = itemIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  const addItem = () => {
    onChange([...items, createNew()])
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono text-[10px]">{label}</span>
        <Button variant="outline" size="sm" onClick={addItem} className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[10px]">
          <Plus size={10} /> Add
        </Button>
      </div>
      {items.length === 0 && (
        <p className="py-2 text-center text-[10px] text-muted-foreground/50 italic">No entries yet. Click "Add" to create one.</p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <SortableItem key={itemIds[i]} id={itemIds[i]}>
                {/* Add left padding for the drag handle */}
                <div className="pl-5">
                  <div className="absolute right-2 top-2">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-5 w-5 rounded-xs p-0.5 text-muted-foreground hover:text-red-500">
                      <X size={12} />
                    </Button>
                  </div>
                  {renderItem(item, i, (updated) => {
                    const copy = [...items]
                    copy[i] = updated
                    onChange(copy)
                  })}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>

        {/* ── Floating drag overlay ── */}
        <DragOverlay dropAnimation={null}>
      {activeId ? (
              <div className="rounded-xs neuro-card p-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
              <div className="pl-5">
                {renderItem(
                  items[itemIds.indexOf(activeId)],
                  itemIds.indexOf(activeId),
                  () => {},
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function SectionSuggestionBanner({
  suggestions,
  onAdd,
  onDismiss,
}: {
  suggestions: SectionKey[]
  onAdd: (section: SectionKey) => void
  onDismiss: () => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="mb-3 rounded-xs border border-primary/20 bg-primary/5 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
        <Lightbulb size={13} />
        Suggestions for your role
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            onClick={() => { onAdd(s); onDismiss() }}
            className="flex items-center gap-1 rounded-xs px-2 py-1 text-[10px]"
          >
            <PlusCircle size={11} /> Add {SECTION_LABELS[s]} {SECTION_ICONS[s]}
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={onDismiss}
          className="rounded-xs px-2 py-1 text-[10px]"
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EDITOR SECTION SORTING
// ═══════════════════════════════════════════════════════════════

function SortableSection({
  id,
  isVisible = true,
  onToggleVisible,
  children,
}: {
  id: string
  isVisible?: boolean
  onToggleVisible?: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="relative group/section"
    >
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          {...attributes}
          {...listeners}
          className="mt-1.5 h-auto w-auto shrink-0 cursor-grab text-muted-foreground/50 opacity-80 group-hover/section:opacity-100 transition-all hover:text-foreground/80 active:cursor-grabbing hover:scale-110"
          title="Drag to reorder section"
        >
          <GripVertical size={14} />
        </Button>
        <div className={cn('flex-1 min-w-0 transition-opacity', !isVisible && 'opacity-40')}>
          {children}
        </div>
        {onToggleVisible && id !== 'basic' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVisible}
            className="mt-1.5 h-auto w-auto shrink-0 text-muted-foreground/50 opacity-0 group-hover/section:opacity-100 transition-all hover:text-foreground"
            title={isVisible ? 'Hide from PDF' : 'Show in PDF'}
          >
            {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Main component ──

export function ResumeDetail({ resumeId }: { resumeId: string }) {
  const router = useRouter()
  const { data: resumesList = [], isSuccess: hydrated } = useResumes()
  const { mutate: addResume } = useCreateResume()
  const { mutate: updateResume } = useUpdateResume()
  const { mutateAsync: deleteResume } = useDeleteResume()
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const storePendingTailor = useUIStore((s) => s.pendingTailor)
  const setPendingTailor = useUIStore((s) => s.setPendingTailor)

  const getResume = (id: string) => resumesList.find((r) => r.id === id)
  const [tab, setTab] = useState<'jobs' | 'view' | 'editor'>('jobs')
  const searchParams = useSearchParams()
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'resume-editor-panels',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  })

  const resume = getResume(resumeId)

  // ── Zustand editor store ──
  const store = useResumeEditor(resumeId, resume)

  // Subscribe to all editor state (the store is the single source of truth)
  const {
    name, setName,
    persona, setPersona,
    role, setRole,
    email, setEmail,
    phone, setPhone,
    location, setLocation,
    github, setGithub,
    summary, setSummary,
    skills, setSkills,
    experience, setExperience,
    education, setEducation,
    projects, setProjects,
    certifications, setCertifications,
    languages, setLanguages,
    customSections, setCustomSections,
    sectionOrder, setSectionOrder,
    sectionVisibility,
    saveStatus,
    suggestions, setSuggestions,
    suggestionDismissed, setSuggestionDismissed,
    showAddSectionPicker, setShowAddSectionPicker,
    optimizing, setOptimizing,
    toggleSectionVisibility,
  } = useStore(store!)

  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')

  const suggestionAnalysed = useRef(false)

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sectionOrder.indexOf(active.id as SectionOrderId)
    const newIndex = sectionOrder.indexOf(over.id as SectionOrderId)
    if (oldIndex === -1 || newIndex === -1) return
    setSectionOrder(arrayMove(sectionOrder, oldIndex, newIndex))
  }

  // ── Editor sections: visible filtered by sectionOrder ──
  const visibleEditorSections = sectionOrder.filter((id) => {
    switch (id) {
      case 'basic': case 'summary': case 'skills': case 'experience': case 'education':
        return true
      case 'projects': return projects.length > 0
      case 'certifications': return certifications.length > 0
      case 'languages': return languages.length > 0
      default: {
        if (typeof id === 'string' && id.startsWith('cs-')) {
          const csId = id.slice(3)
          return customSections.some((s) => s.id === csId)
        }
        return false
      }
    }
  })

  // Analyse resume for section suggestions (once per editor open)
  useEffect(() => {
    if (tab === 'editor' && !suggestionAnalysed.current && resume) {
      suggestionAnalysed.current = true
      const detected = detectSectionSuggestions(resume)
      setSuggestions(detected.filter((s) => {
        // Only suggest sections user doesn't already have
        if (s === 'certifications') return !resume.certifications?.length
        if (s === 'languages') return !resume.languages?.length
        return false
      }))
    }
  }, [tab, resume, setSuggestions])

  // ── Auto-switch to editor tab when arriving with ?mode=review ──
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'review' && storePendingTailor) {
      setTab('editor')
    }
  }, [searchParams, storePendingTailor])

  // Determine which sections can still be added (not already in use)
  const availableSections: SectionKey[] = (() => {
    if (!resume) return []
    const has: Record<string, boolean> = {}
    if (projects.length > 0) has.projects = true
    if (certifications.length > 0) has.certifications = true
    if (languages.length > 0) has.languages = true
    const list = (['projects', 'certifications', 'languages'] as SectionKey[]).filter((s) => !has[s])
    // Always allow adding custom sections
    list.push('custom')
    return list
  })()

  // ── Render each section by ID for the sortable editor ──
  const renderEditorSection = useCallback((id: SectionOrderId): React.ReactNode => {
    switch (id) {
      case 'basic':
        return (
          <>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label-mono mb-1 block">Resume Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
              <div className="flex-1">
                <label className="label-mono mb-1 block">Full Name</label>
                <Input value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="label-mono mb-1 block">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
              <div className="flex-1">
                <label className="label-mono mb-1 block">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-0123" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="label-mono mb-1 block">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
              <div className="flex-1">
                <label className="label-mono mb-1 block">GitHub / Portfolio</label>
                <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="label-mono mb-1 block">Headline / Target Role</label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer (shown under your name on PDF)" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
            </div>
          </>
        )
      case 'summary':
        return (
          <div>
            <label className="label-mono mb-1 block">Professional Summary</label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="w-full resize-y rounded-xs px-3 py-2 text-sm" neumorphic />
          </div>
        )
      case 'skills':
        return (
          <div>
            <label className="label-mono mb-1 block">Skills</label>
            <TagInput tags={skills} onChange={setSkills} placeholder="Type a skill and press Enter" />
          </div>
        )
      case 'experience':
        return (
          <EditableList<ResumeExperience>
            items={experience}
            onChange={setExperience}
            label="Work Experience"
            createNew={() => ({ company: '', role: '', dates: '', bullets: [] })}
            renderItem={(exp, _i, update) => (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Company</label>
                  <Input value={exp.company} onChange={(e) => update({ ...exp, company: e.target.value })} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
                <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Role</label>
                  <Input value={exp.role} onChange={(e) => update({ ...exp, role: e.target.value })} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
              </div>
              <div>
                <label className="label-mono mb-0.5 block text-[10px]">Dates</label>
                <Input value={exp.dates} onChange={(e) => update({ ...exp, dates: e.target.value })} placeholder="Jun 2020 — Present" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
              </div>
              <div>
                <label className="label-mono mb-0.5 block text-[10px]">Highlights (one per line)</label>
                <Textarea
                  value={exp.bullets.join('\n')}
                  onChange={(e) => update({ ...exp, bullets: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  className="w-full resize-y rounded-xs px-3 py-2 text-sm"
                  neumorphic
                />
                </div>
              </div>
            )}
          />
        )
      case 'education':
        return (
          <EditableList<ResumeEducation>
            items={education}
            onChange={setEducation}
            label="Education"
            createNew={() => ({ institution: '', degree: '', field: '', dates: '' })}
            renderItem={(edu, _i, update) => (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Institution</label>
                  <Input value={edu.institution} onChange={(e) => update({ ...edu, institution: e.target.value })} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
                <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Degree</label>
                  <Input value={edu.degree} onChange={(e) => update({ ...edu, degree: e.target.value })} placeholder="BS, MBA, PhD" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Field of Study</label>
                  <Input value={edu.field} onChange={(e) => update({ ...edu, field: e.target.value })} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
                <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Dates</label>
                  <Input value={edu.dates} onChange={(e) => update({ ...edu, dates: e.target.value })} placeholder="2018 — 2022" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
              </div>
              </div>
            )}
          />
        )
      case 'projects':
        return (
          <EditableList<ResumeProject>
            items={projects}
            onChange={setProjects}
            label="Projects"
            createNew={() => ({ name: '', description: '', techStack: [], link: '' })}
            renderItem={(proj, _i, update) => (
              <div className="flex flex-col gap-2">
                <div>
                  <label className="label-mono mb-0.5 block text-[10px]">Project Name</label>
                  <Input value={proj.name} onChange={(e) => update({ ...proj, name: e.target.value })} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
                <div>
                  <label className="label-mono mb-0.5 block text-[10px]">Description</label>
                  <Textarea
                    value={proj.description}
                    onChange={(e) => update({ ...proj, description: e.target.value })}
                    rows={2}
                    className="w-full resize-y rounded-xs px-3 py-2 text-sm" neumorphic
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Tech Stack</label>
                  <TagInput
                    tags={proj.techStack}
                    onChange={(tags) => update({ ...proj, techStack: tags })}
                    placeholder="React, Node..."
                  />
                </div>
                <div className="flex-1">
                  <label className="label-mono mb-0.5 block text-[10px]">Link</label>
                  <Input value={proj.link} onChange={(e) => update({ ...proj, link: e.target.value })} placeholder="https://..." className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                  </div>
                </div>
              </div>
            )}
          />
        )
      case 'certifications':
        return (
          <EditableList<ResumeCertification>
            items={certifications}
            onChange={setCertifications}
            label="Certifications"
            createNew={() => ({ name: '', issuer: '', date: '' })}
            renderItem={(cert, _i, update) => (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label-mono mb-0.5 block text-[10px]">Name</label>
                    <Input value={cert.name} onChange={(e) => update({ ...cert, name: e.target.value })} placeholder="AWS Solutions Architect" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                  </div>
                  <div className="flex-1">
                    <label className="label-mono mb-0.5 block text-[10px]">Issuer</label>
                    <Input value={cert.issuer} onChange={(e) => update({ ...cert, issuer: e.target.value })} placeholder="Amazon Web Services" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                  </div>
                </div>
                <div>
                  <label className="label-mono mb-0.5 block text-[10px]">Date</label>
                  <Input value={cert.date} onChange={(e) => update({ ...cert, date: e.target.value })} placeholder="2024" className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                </div>
              </div>
            )}
          />
        )
      case 'languages':
        return (
          <EditableList<ResumeLanguage>
            items={languages}
            onChange={setLanguages}
            label="Languages"
            createNew={() => ({ name: '', proficiency: '' })}
            renderItem={(lang, _i, update) => (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label-mono mb-0.5 block text-[10px]">Language</label>
                    <Input value={lang.name} onChange={(e) => update({ ...lang, name: e.target.value })} className="w-full rounded-xs px-3 py-2 text-sm" neumorphic />
                  </div>
                  <div className="flex-1">
                    <label className="label-mono mb-0.5 block text-[10px]">Proficiency</label>
                    <Select value={lang.proficiency || ''} onValueChange={(v) => update({ ...lang, proficiency: v || '' })}>
                      <SelectTrigger className="w-full rounded-xs px-3 py-2 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basic">Basic</SelectItem>
                        <SelectItem value="Conversational">Conversational</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Fluent">Fluent</SelectItem>
                        <SelectItem value="Native">Native</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
            )}
          />
        )
    }
    // Handle cs-{id} entries — individual custom sections
    if (typeof id === 'string' && id.startsWith('cs-')) {
      const csId = id.slice(3) // Remove 'cs-' prefix
      const sec = customSections.find((s) => s.id === csId)
      if (!sec) return null
      return (
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Input
              data-cs-id={csId}
              value={sec.title}
              onChange={(e) => setCustomSections(customSections.map((s) => s.id === csId ? { ...s, title: e.target.value } : s))}
              placeholder="Section Title"
              className="flex-1 rounded-xs px-3 py-2 text-sm font-medium"
              neumorphic
            />
          </div>
          <div>
            <label className="label-mono mb-0.5 block text-[10px]">Highlights (one per line)</label>
            <Textarea
              placeholder="Enter each bullet point on a new line"
              value={sec.bullets?.join('\n') || ''}
              onChange={(e) => setCustomSections(customSections.map((s) => s.id === csId ? { ...s, bullets: e.target.value.split('\n').filter(Boolean) } : s))}
              rows={3}
              className="w-full resize-y rounded-xs px-3 py-2 text-sm"
              neumorphic
            />
          </div>
          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setCustomSections(customSections.filter((s) => s.id !== csId))
              setSectionOrder(sectionOrder.filter((oid) => oid !== id))
            }}
            className="absolute right-0 top-0 h-5 w-5 rounded-xs p-0.5 text-muted-foreground/50 hover:text-red-500 transition-colors"
            title="Remove section"
          >
            <X size={12} />
          </Button>
        </div>
      )
    }
    return null
  // Setter identities are stable (zustand never re-creates them) — including
  // them in the dep array is pure noise.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name, persona, email, phone, location, github,
    role, summary, skills,
    experience, education, projects, certifications,
    languages, customSections, sectionOrder,
    setCustomSections, setSectionOrder,
  ])

  // ── Shared form body (used by both desktop and mobile editors to avoid duplication) ──
  const EditorFormBody = () => (
    <div className="flex flex-col gap-3">
      {/* Section suggestion banner */}
      {!suggestionDismissed && (
        <SectionSuggestionBanner
          suggestions={suggestions}
          onAdd={handleAddSection}
          onDismiss={() => setSuggestionDismissed(true)}
        />
      )}

      {/* Sortable sections */}
      <DndContext sensors={sectionSensors} collisionDetection={pointerWithin} onDragEnd={handleSectionDragEnd}>
        <SortableContext items={visibleEditorSections} strategy={verticalListSortingStrategy}>
          {visibleEditorSections.map((id) => (
            <SortableSection
              key={id}
              id={id}
              isVisible={sectionVisibility[id] !== false}
              onToggleVisible={() => toggleSectionVisibility(id)}
            >
              {renderEditorSection(id)}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>

      {/* + Add Section button */}
      {availableSections.length > 0 && !showNewCustomInput && (
        <div className="relative pt-3">
          <Button
            variant="outline"
            onClick={() => setShowAddSectionPicker(!showAddSectionPicker)}
            className="flex items-center gap-1 rounded-xs border-dashed px-3 py-2 text-sm w-full justify-center"
          >
            <PlusCircle size={13} /> Add Section
          </Button>
          {showAddSectionPicker && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xs neuro-card shadow-lg">
              {availableSections.map((s) => (
                <Button
                  key={s}
                  variant="ghost"
                  onClick={() => { handleAddSection(s) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left"
                >
                  <span>{SECTION_ICONS[s]}</span>
                  <span>{SECTION_LABELS[s]}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline title input when adding a new custom section */}
      {showNewCustomInput && (
        <div className="pt-3">
          <div className="flex flex-col gap-2 rounded-xs neuro-inset p-3">
            <label className="label-mono block text-[10px]">Section Title</label>
            <div className="flex gap-2">
              <Input
                ref={newCustomInputRef}
                value={newCustomTitle}
                onChange={(e) => setNewCustomTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreateCustomSection() }
                  if (e.key === 'Escape') { setShowNewCustomInput(false); setNewCustomTitle('') }
                }}
                placeholder="e.g. Open Source Contributions, Volunteering, Awards"
                className="flex-1 rounded-xs px-3 py-2 text-sm"
                autoFocus
                neumorphic
              />
              <Button variant="default" onClick={handleCreateCustomSection} className="rounded-xs px-3 py-1.5 text-sm">
                Add
              </Button>
              <Button variant="outline" onClick={() => { setShowNewCustomInput(false); setNewCustomTitle('') }} className="rounded-xs px-2 py-1.5 text-sm">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── Live resume for real-time PDF preview ──
  const liveResume: Resume = useMemo(() => ({
    ...(resume as Resume),
    name,
    persona,
    role,
    email,
    phone,
    location,
    github,
    summary,
    skills,
    experience,
    education,
    projects,
    certifications,
    languages,
    customSections,
    sectionOrder,
    sectionVisibility,
  }), [
    resume, name, persona, email, phone, location, github,
    role, summary, skills, experience, education,
    projects, certifications, languages, customSections,
    sectionOrder, sectionVisibility,
  ])

  // Debounce the preview with useDeferredValue — keeps typing responsive
  // The PDF re-renders ~200-500ms, so we let React schedule it during idle
  const deferredResume = useDeferredValue(liveResume)

  // ── Tailor review mode ──
  const isReviewMode = storePendingTailor !== null && storePendingTailor.baseResumeId === resumeId

  // ── Debounced autosave via store subscription ──
  useEffect(() => {
    if (!hydrated || !resume || !store) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const unsub = store.subscribe((state) => {
      // Only trigger when editor fields actually change
      if (!state.hasUnsavedChanges()) return
      if (isReviewMode || state.optimizing) return

      // Debounce 1.5s — only show "saving" AFTER user stops typing
      if (timer) clearTimeout(timer)

      timer = setTimeout(() => {
        store.getState().setSaveStatus('saving')
        const s = store.getState()
        updateResume({ id: resume.id, data: {
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
        } }, {
          onSuccess: () => {
            store.getState().markSaved()
            store.getState().setSaveStatus('saved')
            setTimeout(() => store.getState().setSaveStatus('idle'), 3000)
          },
          onError: () => {
            store.getState().setSaveStatus('idle')
            notify({ message: 'Autosave failed. Your local changes are preserved.', type: 'error' })
          },
        })
      }, 1500)
    })

    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
    // `resume` is read for an initial sync into the zustand store; including
    // it would re-run the effect (and reset local edits) on every prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, resume?.id, store, isReviewMode, updateResume])

  // ── Co-Pilot drawer state ──
  const [copilotOpen, setCopilotOpen] = useState(false)

  const handleApplyTailor = (variant: Resume) => {
    addResume({ id: variant.id, data: variant, isBase: false })
    setPendingTailor(null)
    setActiveResumeId(variant.id)
    notify({ message: 'Tailored variant created!', type: 'success' })
  }

  const handleCancelTailor = () => {
    setPendingTailor(null)
    notify({ message: 'Tailoring cancelled. Your resume is unchanged.', type: 'info' })
  }

  const [newCustomTitle, setNewCustomTitle] = useState('')
  const newCustomInputRef = useRef<HTMLInputElement>(null)

  const handleAddSection = useCallback((section: SectionKey) => {
    if (section === 'projects') {
      setProjects(prev => [...prev, { name: '', description: '', techStack: [], link: '' }])
      setShowAddSectionPicker(false)
    } else if (section === 'certifications') {
      setCertifications(prev => [...prev, { name: '', issuer: '', date: '' }])
      setShowAddSectionPicker(false)
    } else if (section === 'languages') {
      setLanguages(prev => [...prev, { name: '', proficiency: '' }])
      setShowAddSectionPicker(false)
    } else if (section === 'custom') {
      // Show inline title input instead of immediately creating
      setShowAddSectionPicker(false)
      setShowNewCustomInput(true)
    }
  }, [setProjects, setCertifications, setLanguages, setShowAddSectionPicker])

  const [showNewCustomInput, setShowNewCustomInput] = useState(false)

  const handleCreateCustomSection = useCallback(() => {
    const title = newCustomTitle.trim() || 'Untitled Section'
    const id = crypto.randomUUID?.()?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)
    const newSection: ResumeCustomSection = { id, title, type: 'bullets', bullets: [] }
    setCustomSections(prev => [...prev, newSection])
    setSectionOrder(prev => {
      let insertAfter = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (!prev[i].startsWith('cs-')) {
          insertAfter = i
          break
        }
      }
      const newOrder = [...prev]
      newOrder.splice(insertAfter + 1, 0, `cs-${id}` as SectionOrderId)
      return newOrder
    })
    setNewCustomTitle('')
    setShowNewCustomInput(false)
    // Focus the new section's title input after render
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`[data-cs-id="${id}"]`)
      input?.focus()
      input?.select()
    }, 50)
  }, [newCustomTitle, setCustomSections, setSectionOrder])

  // ── Review mode: compute previewed resume from accepted changes ──
  // MUST be before early return (hooks rule)
  const reviewPreviewResume = useMemo(() => {
    if (!storePendingTailor) return resume as Resume
    const { baseResume, changes, accepted } = storePendingTailor
    let result: Resume = { ...baseResume }
    for (const change of changes) {
      if (!accepted.has(change.id)) continue
      switch (change.field) {
        case 'summary':
          result = { ...result, summary: change.after }
          break
        case 'role':
          result = { ...result, role: change.after }
          break
        case 'skill-add':
          result = { ...result, skills: [...(result.skills || []), change.after] }
          break
        case 'skill-remove':
          result = { ...result, skills: (result.skills || []).filter(s => s !== change.before) }
          break
        case 'bullet': {
          if (change.anchor?.experienceIndex === undefined || change.anchor?.bulletIndex === undefined) break
          const expIdx = change.anchor.experienceIndex
          const bulletIdx = change.anchor.bulletIndex
          const experiences = [...(result.experience || [])]
          if (expIdx < experiences.length) {
            const exp = { ...experiences[expIdx] }
            const bullets = [...(exp.bullets || [])]
            if (bulletIdx < bullets.length) {
              bullets[bulletIdx] = change.after
            } else {
              bullets.push(change.after)
            }
            exp.bullets = bullets
            experiences[expIdx] = exp
          }
          result = { ...result, experience: experiences }
          break
        }
      }
    }
    return result
    // Reads `resume` for fallback merging but should only recompute when the
    // pending tailor payload changes (not on every resume prop update).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storePendingTailor])

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span>Loading resume…</span>
        </div>
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Resume not found. <Button variant="link" onClick={() => router.push('/chat')} className="ml-2">Back to Chat</Button>
      </div>
    )
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const s = store!.getState()
      const res = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: {
            name: s.name,
            persona: s.persona,
            summary: s.summary,
            skills: s.skills,
            experience: s.experience,
          },
          job: 'Optimize this resume for maximum impact in the tech industry. Use strong action verbs, quantify achievements, and ensure the summary is compelling.',
        }),
      })
      if (!res.ok) throw new Error('Optimization failed')
      const data = await res.json()
      if (data.optimized) {
        if (data.optimized.summary) setSummary(data.optimized.summary)
        if (data.optimized.skills) setSkills(data.optimized.skills)
        notify({ message: 'Resume optimized! Review the changes and click Save.', type: 'success' })
      } else {
        throw new Error('No optimized content returned')
      }
    } catch {
      notify({ message: 'AI optimization failed. Try again or use the Co-Pilot.', type: 'error' })
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with tabs */}
      <div className="flex shrink-0 flex-col md:flex-row md:items-center justify-between gap-2 neuro-surface px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto min-w-0 max-w-full">
          <Button variant="outline" size="sm" onClick={() => router.push('/chat')} className="flex shrink-0 items-center gap-1 rounded-sm px-2.5 py-1.5 text-sm">
            <ArrowLeft size={12} /> Back
          </Button>
          <div className="ml-3 flex gap-1 overflow-x-auto rounded-sm neuro-inset p-0.5">
            {(['jobs', 'view', 'editor'] as const).map((t) => (
              <Button
                key={t}
                variant="ghost"
                onClick={() => {
                  if (t !== 'editor') suggestionAnalysed.current = false // reset for next open
                  setTab(t)
                }}
                className={cn(
                  'shrink-0 rounded-xs px-3 py-1.5 text-sm font-medium transition-all',
                  tab === t ? 'neuro-card text-foreground font-semibold' : 'text-muted-foreground',
                )}
              >
                {t === 'jobs' ? 'Find Jobs' : t === 'view' ? 'View Resume' : 'Resume Editor'}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <h1 className="truncate text-sm font-semibold max-w-[150px] sm:max-w-xs">{resume.name}</h1>
          <span className="rounded-xs bg-success-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-success">{resume.score}% Match</span>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-1 rounded-sm px-2.5 py-1.5 text-sm text-muted-foreground hover:text-red-500 hover:border-red-500/30" title="Delete resume">
            <Trash2 size={11} /> Delete
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Tab 1: Find Jobs ── */}
        {tab === 'jobs' && (
          <JobSearchPanel resume={resume} />
        )}

        {/* ── Tab 2: View Resume ── */}
        {tab === 'view' && (
          <div className="flex w-full flex-col overflow-hidden">
            {/* Template gallery bar */}
            <div className="shrink-0 neuro-surface p-3">
              <div className="mx-auto max-w-[794px]">
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setGalleryOpen(!galleryOpen)} className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-semibold">
                    <span>Template: {getTemplateMeta(resume?.template || DEFAULT_TEMPLATE).name}</span>
                    {galleryOpen ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </Button>
                  <div className="flex gap-1.5">
                    <Button variant="default" size="sm" onClick={() => window.open(`/api/export/pdf?id=${resume?.id}`, '_blank')} className="flex items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium">
                      <Eye size={11} /> Export PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => notify({ message: 'DOCX export coming soon', type: 'info' })} className="flex items-center gap-1 rounded-sm px-3 py-2 text-sm">
                      Export DOCX
                    </Button>
                  </div>
                </div>
                <div className={cn(
                  "grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-in-out",
                  galleryOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"
                )}>
                  <div className="overflow-hidden">
                    <TemplateGallery
                      value={resume?.template || DEFAULT_TEMPLATE}
                      onChange={(template) => {
                        if (resume) {
                          updateResume({ id: resume.id, data: { template } })
                          setGalleryOpen(false)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* PDF preview — fills remaining space.
                Uses liveResume (not raw resume) so the View tab stays in sync
                with unsaved editor changes — same data the editor preview shows. */}
            <div className="min-h-0 flex-1 neuro-surface">
              <ResumePreview resume={liveResume} />
            </div>
          </div>
        )}

        {/* ── Tab 3: Tailor Review Mode ── */}
        {tab === 'editor' && isReviewMode && (
          <div className="flex w-full flex-col lg:flex-row">
            {/* Change list panel (left) */}
            <div className="w-full lg:w-[45%] overflow-y-auto shadow-[1px_0_2px_rgba(0,0,0,0.04)]">
              <TailorReviewPanel onApply={handleApplyTailor} onCancel={handleCancelTailor} />
            </div>
            {/* Live PDF with accepted changes (right) */}
            <div className="hidden lg:flex w-[55%] min-w-[350px] flex-col neuro-surface">
              <div className="flex-1 min-h-0">
                <ResumePreview resume={reviewPreviewResume} />
              </div>
            </div>
            {/* Mobile fallback */}
            <div className="lg:hidden">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground list-none">
                  <span>Preview PDF (with accepted changes)</span>
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="h-[500px]">
                  <ResumePreview resume={reviewPreviewResume} />
                </div>
              </details>
            </div>
          </div>
        )}

        {/* ── Tab 4: Resume Editor ── */}
        {tab === 'editor' && !isReviewMode && (
          <>
            {/* Mobile tab toggle */}
            <div className="flex shrink-0 neuro-surface lg:hidden">
              <Button
                variant="ghost"
                onClick={() => setMobileView('edit')}
                className={cn('flex-1 rounded-none py-2 text-xs font-medium', mobileView === 'edit' ? 'border-b-2 border-primary text-foreground font-semibold' : 'text-muted-foreground')}
              >
                ✏️ Edit
              </Button>
              <Button
                variant="ghost"
                onClick={() => setMobileView('preview')}
                className={cn('flex-1 rounded-none py-2 text-xs font-medium', mobileView === 'preview' ? 'border-b-2 border-primary text-foreground font-semibold' : 'text-muted-foreground')}
              >
                📄 Preview
              </Button>
            </div>

            {/* Desktop: resizable panels */}
            <div className="hidden lg:flex flex-1 min-h-0">
              <ResizableGroup direction="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
                {/* Form editor (left) */}
                <ResizablePanel defaultSize="55%" minSize="30%" maxSize="80%">
                  <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 md:p-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between rounded-sm neuro-card p-2 px-3 shrink-0">
                      <div className="flex gap-2">
                        {/* Save status indicator */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {saveStatus === 'saving' && (
                            <>
                              <div className="h-2.5 w-2.5 animate-spin rounded-full border border-border border-t-primary" />
                              <span>Saving…</span>
                            </>
                          )}
                          {saveStatus === 'saved' && (
                            <>
                              <div className="h-2 w-2 rounded-full bg-success" />
                              <span className="text-success font-medium">Saved</span>
                            </>
                          )}
                          {saveStatus === 'idle' && (
                            <>
                              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                              <span>Auto-saved</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          const copy = { ...resume, id: crypto.randomUUID(), name: `${resume.name} (Copy)`, updated: 'just now' }
                          addResume({ id: copy.id, data: copy })
                          setActiveResumeId(copy.id)
                          notify({ message: 'Resume cloned', type: 'success' })
                        }} className="flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs">
                          Save as New
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleOptimize} disabled={optimizing} className="flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs disabled:opacity-50">
                          <Wand2 size={11} /> {optimizing ? 'Optimizing…' : 'AI Optimize'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCopilotOpen(true)}
                          className={cn('flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs', copilotOpen && 'opacity-50')}
                        >
                          <Sparkles size={11} /> Co-Pilot
                        </Button>
                      </div>
                    </div>

                    {/* Form body */}
                    <div className="flex-1 rounded-sm neuro-inset p-5 overflow-y-auto">
                      {EditorFormBody()}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Live PDF preview (right) */}
                <ResizablePanel defaultSize="45%" minSize="20%" maxSize="70%" collapsible={true} collapsedSize="0%">
                  <div className="h-full neuro-surface">
                    <ResumePreview resume={deferredResume} />
                  </div>
                </ResizablePanel>
              </ResizableGroup>
            </div>

            {/* Mobile: editor OR preview (one at a time) */}
            <div className="flex-1 overflow-y-auto lg:hidden">
              {mobileView === 'edit' && (
                <div className="flex flex-col gap-3 p-4">
                  {/* Toolbar — simplified for mobile */}
                  <div className="flex items-center justify-between rounded-sm neuro-card p-2 px-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {saveStatus === 'saving' && <span>Saving…</span>}
                      {saveStatus === 'saved' && <span className="text-success">Saved</span>}
                      {saveStatus === 'idle' && <span>Auto-saved</span>}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOptimize} disabled={optimizing} className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs disabled:opacity-50">
                      <Wand2 size={11} /> {optimizing ? '…' : 'AI'}
                    </Button>
                  </div>

                  {/* Form body */}
                  <div className="rounded-sm neuro-inset p-4">
                    {EditorFormBody()}
                  </div>
                </div>
              )}
              {mobileView === 'preview' && (
                <div className="h-full neuro-surface min-h-[600px]">
                  <ResumePreview resume={deferredResume} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Co-Pilot Drawer (overlay, slides over the PDF) ── */}
        {tab === 'editor' && copilotOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 lg:hidden"
              onClick={() => setCopilotOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed right-0 top-0 z-50 h-full w-full max-w-[380px] shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="relative flex h-full flex-col neuro-surface">
                {/* Drawer header with close */}
                <div className="flex shrink-0 items-center justify-between neuro-surface px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">AI</div>
                    <span className="text-xs font-semibold">AI Co-Pilot</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCopilotOpen(false)} className="h-6 w-6 rounded-xs p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X size={14} />
                  </Button>
                </div>
                {/* Co-Pilot content — reuse the component but without its own outer wrapper */}
                <ResumeCopilot resume={resume as Resume} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => { if (!deleting) setShowDeleteDialog(false) }}
        onConfirm={async () => {
          setDeleting(true)
          try {
            await deleteResume(resume.id)
            notify({ message: `"${resume.name}" deleted`, type: 'success' })
            router.push('/chat')
          } catch {
            notify({ message: 'Failed to delete resume', type: 'error' })
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete Resume?"
        description={`Remove "${resume.name}"? This action cannot be undone, but you can re-upload your resume anytime.`}
        confirmLabel="Delete Resume"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
