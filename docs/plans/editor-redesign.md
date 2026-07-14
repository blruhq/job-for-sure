# Editor Redesign + Tracker Intake — Build Plan

> **For the coding agent:** Follow every step in order. Do NOT skip steps. Do NOT improvise. Every code block is copy-paste ready. File paths are absolute from project root. When a step says "replace lines X-Y", open the file, find those exact lines, and replace them.

## Overview

Three features, built in order:

| # | Feature | Files touched | Depends on |
|---|---------|--------------|------------|
| 0 | Type + Store changes (prerequisite) | `types/resume.ts`, `store.tsx` | — |
| 1 | Paste-URL Tracker intake | `applications-view.tsx` | 0 |
| 2 | Live PDF Editor pane + Co-Pilot drawer | `resume-detail.tsx`, `resume-copilot.tsx` | 0 |
| 3 | Tailor Review Mode (merged diff viewer) | `api/ai/tailor/route.ts`, `ats-view.tsx`, `resume-detail.tsx`, new `TailorReviewPanel.tsx` | 0, 2 |
| 4 | Variant grouping in sidebar | `sidebar.tsx` | 0 |

**Build order:** 0 → 1 (parallel with 2) → 2 → 3 → 4

**No DB migrations.** The `resumes` table already has `isBase: boolean` column. We store `baseResumeId` inside the JSON `data` field.

---

## Step 0: Type + Store Changes (PREREQUISITE — do this first)

### 0A. Add variant fields to Resume type

**File:** `src/app/types/resume.ts`

Find the `Resume` interface (starts at line 72). Add three optional fields after `coverLetterJD?: string` (line 96) and before the closing `}`:

```typescript
  baseResumeId?: string       // ID of parent resume if this is a tailored variant
  isVariant?: boolean         // True if this resume is a tailored variant (not a base)
  variantLabel?: string       // Display label, e.g. "Tailored for Google — SWE"
```

The end of the interface should look like:

```typescript
export interface Resume {
  id: string
  name: string
  role: string
  persona: string
  email?: string
  phone?: string
  location?: string
  github?: string
  photoUrl?: string
  score: number
  updated: string
  skills: string[]
  summary?: string
  experience?: ResumeExperience[]
  education?: ResumeEducation[]
  projects?: ResumeProject[]
  certifications?: ResumeCertification[]
  languages?: ResumeLanguage[]
  customSections?: ResumeCustomSection[]
  companies: Company[]
  stretch: Company[]
  template?: ResumeTemplate
  coverLetter?: string
  coverLetterJD?: string
  baseResumeId?: string       // ID of parent resume if this is a tailored variant
  isVariant?: boolean         // True if this resume is a tailored variant (not a base)
  variantLabel?: string       // Display label, e.g. "Tailored for Google — SWE"
}
```

### 0B. Add TailorChange type

**File:** `src/app/types/resume.ts`

Add this new type at the end of the file, after the `JobDescription` interface (after line 140):

```typescript
// ── Tailor review mode ──

export type TailorChangeField = 'summary' | 'skill-add' | 'skill-remove' | 'bullet' | 'role'

export interface TailorChange {
  id: string
  field: TailorChangeField
  label: string               // Human-readable label, e.g. "Summary", "Experience bullet 2"
  anchor?: {
    experienceIndex?: number
    bulletIndex?: number
  }
  before: string
  after: string
  rationale?: string
}

export interface TailorResult {
  optimized: Resume           // Fully-optimized resume (all changes applied)
  changes: TailorChange[]     // Individual changes for review
}

export interface PendingTailor {
  baseResumeId: string        // The original resume being tailored
  baseResume: Resume          // Snapshot of original before changes
  optimized: Resume           // Fully-optimized version from AI
  changes: TailorChange[]     // Individual changes
  accepted: Set<string>       // IDs of accepted changes (Set<TailorChange.id>)
  jobContext?: {              // Optional job info for labeling the variant
    company?: string
    title?: string
  }
}
```

### 0C. Add pendingTailor + addVariant to the store

**File:** `src/app/lib/store.tsx`

#### 0C-1. Add import

At line 4, change the import to include `PendingTailor`:

Find:
```typescript
import type { ApplicationBoard, PipelineJob, Resume } from '~/types/resume'
```

Replace with:
```typescript
import type { ApplicationBoard, PipelineJob, Resume, PendingTailor } from '~/types/resume'
```

#### 0C-2. Add state + actions to AppStore interface

In the `AppStore` interface (starts at line 71), after the `loading: boolean` line (line 101) and before the closing `}`, add:

```typescript
  // Tailor review mode
  pendingTailor: PendingTailor | null
  setPendingTailor: (pending: PendingTailor | null) => void
  toggleAcceptedChange: (changeId: string) => void
  addVariantResume: (resume: Resume) => void
```

#### 0C-3. Add state to the provider

In `AppStoreProvider` function, after the `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)` line (line 152), add:

```typescript
  const [pendingTailor, setPendingTailorState] = useState<PendingTailor | null>(null)
```

#### 0C-4. Add action implementations

After the `const toggleSidebar = useCallback(...)` block (line 387), add these functions:

```typescript
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
```

#### 0C-5. Add to the memoized value

In the `useMemo<AppStore>` block (line 389), add the new fields to the returned object. After `loading,` (line 410), add:

```typescript
    pendingTailor,
    setPendingTailor,
    toggleAcceptedChange,
    addVariantResume,
```

And in the dependency array (after line 416 `toggleSidebar,`), add:

```typescript
    pendingTailor, setPendingTailor, toggleAcceptedChange, addVariantResume,
```

---

## Step 1: Paste-URL Tracker Intake

**File:** `src/app/components/pipeline/applications-view.tsx`

### 1A. Add paste-URL input state and handler

In the `ApplicationsView` component function (line 113), after the existing state declarations (after line 119, `const [activeJob, setActiveJob] = ...`), add:

```typescript
  const [pasteUrl, setPasteUrl] = useState('')
  const [scraping, setScraping] = useState(false)

  const { bookmarkJob } = useAppStore()
```

Note: `bookmarkJob` is already in the store but not destructured. Add it to the existing destructuring at line 116:

Find:
```typescript
  const { applications, moveJob, removeJob, clearApplications } = useAppStore()
```

Replace with:
```typescript
  const { applications, moveJob, removeJob, clearApplications, bookmarkJob } = useAppStore()
```

### 1B. Add the scrape-and-bookmark handler

After the `handleDragOver` function (line 191-193), add:

```typescript
  const handlePasteUrl = async () => {
    const url = pasteUrl.trim()
    if (!url) return

    // Basic URL validation
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      notify({ message: 'Please enter a valid URL', type: 'error' })
      return
    }

    setScraping(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Scrape failed')
      const data = await res.json()

      if (data.success && data.job) {
        bookmarkJob({
          key: `${parsedUrl.hostname}-${Date.now()}`,
          company: data.job.company || 'Unknown Company',
          title: data.job.title || 'Unknown Position',
          loc: data.job.location || '',
          score: 0,
          level: 'mid' as const,
          time: 'saved',
          url: url,
          logo: '',
          color: '',
          resume: '',
        })
        notify({ message: `Added "${data.job.title}" at ${data.job.company}`, type: 'success' })
        setPasteUrl('')
      } else {
        // Scrape failed — show helpful error
        notify({
          message: data.error || 'Could not scrape this page. Try pasting the job details manually.',
          type: 'error',
        })
      }
    } catch {
      notify({ message: 'Failed to scrape URL. Please try again.', type: 'error' })
    } finally {
      setScraping(false)
    }
  }
```

### 1C. Add the paste-URL UI to the header

Find the header div (line 198-220). Replace the entire header block:

Find (line 198-220):
```typescript
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">
            {total} {t('bookmark').toLowerCase() === 'bookmark' ? 'Jobs' : 'งาน'}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-mono">
              {t('resume')}
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
            >
              {resumeNames.map((name) => (
                <option key={name} value={name}>
                  {name === 'all' ? t('all') : name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
```

Replace with:
```typescript
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-foreground">
              {total} {t('bookmark').toLowerCase() === 'bookmark' ? 'Jobs' : 'งาน'}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {t('resume')}
              </span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="cursor-pointer rounded-xs border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
              >
                {resumeNames.map((name) => (
                  <option key={name} value={name}>
                    {name === 'all' ? t('all') : name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Paste URL input */}
        <div className="flex items-center gap-1.5">
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !scraping) handlePasteUrl()
            }}
            placeholder="Paste a job URL (Indeed, Greenhouse, JobsDB...) and press Enter"
            disabled={scraping}
            className="flex-1 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
          <button
            onClick={handlePasteUrl}
            disabled={scraping || !pasteUrl.trim()}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xs bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scraping ? (
              <>
                <RefreshCw size={11} className="animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Link2 size={11} />
                Add
              </>
            )}
          </button>
        </div>
      </div>
```

### 1D. Add the RefreshCw import

At line 5, the existing imports from `lucide-react` are:

```typescript
import { Trash2, Link2 } from 'lucide-react'
```

Change to:

```typescript
import { Trash2, Link2, RefreshCw } from 'lucide-react'
```

### 1E. Verification

After this step:
- [ ] Typing a Greenhouse/Indeed URL + Enter scrapes and adds a card to `bookmark` column
- [ ] Invalid URL shows error toast
- [ ] Scrape failure (e.g., LinkedIn) shows error toast with helpful message
- [ ] Spinner shows during scraping
- [ ] Input clears on success

---

## Step 2: Live PDF Editor Pane + Co-Pilot Drawer

**Files:** `src/app/components/resume/resume-detail.tsx`, `src/app/components/resume/resume-copilot.tsx`

### 2A. Build liveResume from edit state

**File:** `src/app/components/resume/resume-detail.tsx`

In the `ResumeDetail` component, after the `renderEditorSection` useCallback block (after line 735), add:

```typescript
  // ── Live resume for real-time PDF preview ──
  const liveResume: Resume = useMemo(() => ({
    ...(resume as Resume),
    name: editName,
    persona: editPersona,
    role: editRole,
    email: editEmail,
    phone: editPhone,
    location: editLocation,
    github: editGithub,
    summary: editSummary,
    skills: editSkillsArr,
    experience: editExperiences,
    education: editEducations,
    projects: editProjectsArr,
    certifications: editCertifications,
    languages: editLanguages,
    customSections: editCustomSections,
  }), [
    resume,
    editName, editPersona, editRole, editEmail, editPhone, editLocation, editGithub,
    editSummary, editSkillsArr, editExperiences, editEducations, editProjectsArr,
    editCertifications, editLanguages, editCustomSections,
  ])

  // Debounce the preview with useDeferredValue — keeps typing responsive
  // The PDF re-renders ~200-500ms, so we let React schedule it during idle
  const deferredResume = useDeferredValue(liveResume)

  // ── Co-Pilot drawer state ──
  const [copilotOpen, setCopilotOpen] = useState(false)
```

Also add `useMemo` and `useDeferredValue` to the React imports at line 3:

Find:
```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
```

Replace with:
```typescript
import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react'
```

### 2B. Replace the editor tab layout

**File:** `src/app/components/resume/resume-detail.tsx`

Find the editor tab section. It starts at line 904 with `{tab === 'editor' && (` and ends at line 990 with `)}`.

Replace the ENTIRE block from line 904 to line 990 with:

```typescript
        {/* ── Tab 3: Resume Editor ── */}
        {tab === 'editor' && (
          <div className="flex w-full flex-col lg:flex-row">
            {/* Form editor (left) */}
            <div className="flex w-full lg:w-[55%] flex-col gap-3 overflow-y-auto border-r border-border p-4 md:p-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between rounded-sm border border-border bg-card p-2 px-3">
                <div className="flex gap-2">
                  <button onClick={saveChanges} className="flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                    <Download size={11} /> Save Changes
                  </button>
                  <button onClick={() => {
                    const copy = { ...resume, id: String(Date.now()), name: `${resume.name} (Copy)`, updated: 'just now' }
                    addResume(copy)
                    setActiveResumeId(copy.id)
                    notify({ message: 'Resume cloned', type: 'success' })
                  }} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted">
                    Save as New
                  </button>
                  <button onClick={handleOptimize} disabled={optimizing} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50">
                    <Wand2 size={11} /> {optimizing ? 'Optimizing…' : 'AI Optimize'}
                  </button>
                </div>
                {/* Co-Pilot toggle button */}
                <button
                  onClick={() => setCopilotOpen(true)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted',
                    copilotOpen && 'opacity-50',
                  )}
                >
                  <Sparkles size={11} /> Co-Pilot
                </button>
              </div>

              {/* Form body */}
              <div className="resume-paper flex-1 rounded-xs p-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                <div className="flex flex-col gap-3">

                  {/* Section suggestion banner */}
                  {!suggestionDismissed && (
                    <SectionSuggestionBanner
                      suggestions={suggestions}
                      onAdd={handleAddSection}
                      onDismiss={() => setSuggestionDismissed(true)}
                    />
                  )}

                  {/* ── Sortable sections ── */}
                  <DndContext sensors={sectionSensors} collisionDetection={pointerWithin} onDragEnd={handleSectionDragEnd}>
                    <SortableContext items={visibleEditorSections} strategy={verticalListSortingStrategy}>
                      {visibleEditorSections.map((id) => (
                        <SortableSection key={id} id={id}>
                          {renderEditorSection(id)}
                        </SortableSection>
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* + Add Section button */}
                  {availableSections.length > 0 && (
                    <div className="relative border-t border-border/50 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAddSectionPicker(!showAddSectionPicker)}
                        className="flex cursor-pointer items-center gap-1 rounded-xs border border-dashed border-border bg-transparent px-3 py-2 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-all w-full justify-center"
                      >
                        <PlusCircle size={13} /> Add Section
                      </button>
                      {showAddSectionPicker && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xs border border-border bg-card shadow-lg">
                          {availableSections.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                handleAddSection(s)
                                setShowAddSectionPicker(false)
                              }}
                              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[11px] text-left text-foreground hover:bg-muted"
                            >
                              <span>{SECTION_ICONS[s]}</span>
                              <span>{SECTION_LABELS[s]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live PDF preview (right) — hidden on mobile */}
            <div className="hidden lg:flex w-[45%] min-w-[350px] flex-col bg-muted/30">
              <div className="flex-1 min-h-0">
                <ResumePreview resume={deferredResume} />
              </div>
            </div>

            {/* Mobile PDF toggle (visible below lg) */}
            <div className="lg:hidden border-t border-border">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground list-none">
                  <span>Preview PDF</span>
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="h-[500px] border-t border-border">
                  <ResumePreview resume={deferredResume} />
                </div>
              </details>
            </div>
          </div>
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
              <div className="relative flex h-full flex-col bg-card">
                {/* Drawer header with close */}
                <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">AI</div>
                    <span className="text-xs font-semibold">AI Co-Pilot</span>
                  </div>
                  <button
                    onClick={() => setCopilotOpen(false)}
                    className="cursor-pointer rounded-xs p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Co-Pilot content — reuse the component but without its own outer wrapper */}
                <ResumeCopilot resume={resume as Resume} />
              </div>
            </div>
          </>
        )}
```

**IMPORTANT:** Add the `Sparkles` icon to the lucide-react import at line 5:

Find:
```typescript
import { ArrowLeft, Wand2, Download, Trash2, Plus, X, PlusCircle, Lightbulb, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
```

Replace with:
```typescript
import { ArrowLeft, Wand2, Download, Trash2, Plus, X, PlusCircle, Lightbulb, GripVertical, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
```

### 2C. Update ResumeCopilot to remove its own layout wrapper

**File:** `src/app/components/resume/resume-copilot.tsx`

The `ResumeCopilot` component currently has an outer `<div>` with width classes at line 60:
```typescript
  return (
    <div className="flex w-full lg:w-[35%] lg:min-w-[280px] lg:max-w-[360px] flex-col border-t lg:border-t-0 lg:border-l border-border bg-card">
```

Change line 60 to remove the width/border classes (it's now inside a drawer):

Find:
```typescript
    <div className="flex w-full lg:w-[35%] lg:min-w-[280px] lg:max-w-[360px] flex-col border-t lg:border-t-0 lg:border-l border-border bg-card">
```

Replace with:
```typescript
    <div className="flex flex-1 flex-col overflow-hidden">
```

Also remove the Co-Pilot header from ResumeCopilot (lines 62-68), since the drawer already has its own header:

Find (lines 62-68):
```typescript
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-card px-4 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">AI</div>
        <span className="text-xs font-semibold">AI Co-Pilot</span>
        <span className="ml-auto rounded-xs bg-success-soft px-1.5 py-px font-mono text-[9px] font-semibold text-success">
          {isStreaming ? 'Thinking…' : 'Active'}
        </span>
      </div>
```

Replace with:
```typescript
      {/* Status indicator (header is in the drawer wrapper) */}
      <div className="flex shrink-0 items-center justify-end gap-2 px-4 pt-2">
        <span className="rounded-xs bg-success-soft px-1.5 py-px font-mono text-[9px] font-semibold text-success">
          {isStreaming ? 'Thinking…' : 'Active'}
        </span>
      </div>
```

### 2D. Fix the saveChanges to not switch tabs

**File:** `src/app/components/resume/resume-detail.tsx`

In `saveChanges` (line 756), find and remove the tab switch:

Find:
```typescript
    notify({ message: 'Resume saved', type: 'success' })
    setTab('jobs')
```

Replace with:
```typescript
    notify({ message: 'Resume saved', type: 'success' })
```

### 2E. Verification

After this step:
- [ ] Editor tab shows form on left (55%), live PDF on right (45%) on desktop
- [ ] Typing in any form field updates the PDF within ~500ms
- [ ] Typing feels responsive (no input lag)
- [ ] Co-Pilot button in toolbar opens a slide-in drawer
- [ ] Closing the drawer (X or backdrop click) returns to normal
- [ ] On mobile, PDF preview is a collapsible `<details>` toggle
- [ ] "Save Changes" persists but does NOT switch away from the editor tab
- [ ] "View Resume" tab still works independently

---

## Step 3: Tailor Review Mode (Merged Diff Viewer)

**Files:** `src/app/api/ai/tailor/route.ts`, `src/app/components/ats/ats-view.tsx`, `src/app/components/resume/resume-detail.tsx`, NEW `src/app/components/resume/tailor-review-panel.tsx`

### 3A. Enrich the tailor API changes[] schema

**File:** `src/app/api/ai/tailor/route.ts`

Replace the `TailorSchema` (lines 14-36) with an enriched version:

Find (lines 14-36):
```typescript
const TailorSchema = z.object({
  optimized: z.object({
    name: z.string(),
    persona: z.string().optional(),
    summary: z.string(),
    skills: z.array(z.string()),
    experience: z.array(
      z.object({
        company: z.string(),
        role: z.string(),
        dates: z.string(),
        bullets: z.array(z.string()),
      })
    ),
  }).passthrough(),
  changes: z.array(
    z.object({
      field: z.string(),
      before: z.string(),
      after: z.string(),
    })
  ),
})
```

Replace with:
```typescript
const TailorSchema = z.object({
  optimized: z.object({
    name: z.string(),
    persona: z.string().optional(),
    summary: z.string(),
    skills: z.array(z.string()),
    experience: z.array(
      z.object({
        company: z.string(),
        role: z.string(),
        dates: z.string(),
        bullets: z.array(z.string()),
      })
    ),
  }).passthrough(),
  changes: z.array(
    z.object({
      id: z.string(),
      field: z.enum(['summary', 'skill-add', 'skill-remove', 'bullet', 'role']),
      label: z.string(),
      anchor: z.object({
        experienceIndex: z.number().optional(),
        bulletIndex: z.number().optional(),
      }).optional(),
      before: z.string(),
      after: z.string(),
      rationale: z.string().optional(),
    })
  ),
})
```

### 3B. Update the system prompt to emit enriched changes

**File:** `src/app/api/ai/tailor/route.ts`

Find the system prompt (lines 46-59). After the existing rules, add instructions for the enriched changes format.

Find:
```typescript
  const result = await generateObjectWithFailover<z.infer<typeof TailorSchema>>({
    system: `You are a professional resume optimization expert. 
You receive a candidate's resume data and optimization instructions.
You return a JSON object with:
1. "optimized": the full resume object with rewritten content optimized for the target job instructions
2. "changes": an array of {field, before, after} objects describing what changed

Rules:
- NEVER fabricate experience, skills, or credentials not in the original resume
- Rewrite experience bullets to use keywords and terminology from the instructions/job details
- Reorder skills so the most relevant ones appear first
- Adjust the professional summary to reflect the target role
- Keep the same length or shorter than original
- Preserve all dates, company names, and factual data
- Always output the optimized resume fields (summary, experience bullets, skills, persona) in the same language as the INPUT resume. Do not translate the resume content to another language. If the input resume is in Thai, output in Thai. If in English, output in English.`,
```

Replace with:
```typescript
  const result = await generateObjectWithFailover<z.infer<typeof TailorSchema>>({
    system: `You are a professional resume optimization expert.
You receive a candidate's resume data and optimization instructions.
You return a JSON object with:
1. "optimized": the full resume object with rewritten content optimized for the target job instructions
2. "changes": an array of change objects describing EVERY modification made

Rules:
- NEVER fabricate experience, skills, or credentials not in the original resume
- Rewrite experience bullets to use keywords and terminology from the instructions/job details
- Reorder skills so the most relevant ones appear first
- Adjust the professional summary to reflect the target role
- Keep the same length or shorter than original
- Preserve all dates, company names, and factual data
- Always output the optimized resume fields (summary, experience bullets, skills, persona) in the same language as the INPUT resume. Do not translate the resume content to another language. If the input resume is in Thai, output in Thai. If in English, output in English.

Each change object MUST have:
- "id": a unique kebab-case identifier (e.g. "summary-rewrite", "exp-0-bullet-1", "skill-add-docker")
- "field": one of "summary", "skill-add", "skill-remove", "bullet", "role"
- "label": a human-readable label (e.g. "Professional Summary", "Experience bullet 2 at Acme Corp")
- "anchor": (optional) { "experienceIndex": number, "bulletIndex": number } to locate bullet changes
- "before": the original text (empty string for skill-add)
- "after": the new text (empty string for skill-remove)
- "rationale": a brief explanation of WHY this change helps match the job (e.g. "Aligns with job's emphasis on Kubernetes")

List EVERY change. If you rewrote the summary, that's one change. If you rewrote 3 bullets, that's 3 changes. If you added 2 skills, that's 2 changes.`,
```

### 3C. Create the TailorReviewPanel component

**File:** `src/app/components/resume/tailor-review-panel.tsx` (NEW FILE)

```typescript
'use client'

import { useMemo } from 'react'
import { Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import type { Resume, PendingTailor, TailorChange } from '~/types/resume'

// ── Pure function: apply only accepted changes to produce the previewed resume ──
function applyAcceptedChanges(base: Resume, optimized: Resume, changes: TailorChange[], accepted: Set<string>): Resume {
  // Start from the base resume
  let result: Resume = { ...base }

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
}

export function TailorReviewPanel({ onApply, onCancel }: { onApply: (variant: Resume) => void; onCancel: () => void }) {
  const { pendingTailor, toggleAcceptedChange, setPendingTailor } = useAppStore()

  if (!pendingTailor) return null

  const { changes, accepted, optimized, baseResume } = pendingTailor

  // Compute the previewed resume from accepted changes
  const previewedResume = useMemo(
    () => applyAcceptedChanges(baseResume, optimized, changes, accepted),
    [baseResume, optimized, changes, accepted]
  )

  const acceptedCount = accepted.size
  const totalCount = changes.length

  const handleApply = () => {
    // Create a variant resume from the previewed state
    const variant: Resume = {
      ...previewedResume,
      id: String(Date.now()),
      name: pendingTailor.jobContext
        ? `${baseResume.name} → ${pendingTailor.jobContext.company || 'Tailored'}`
        : `${baseResume.name} (Optimized)`,
      baseResumeId: baseResume.id,
      isVariant: true,
      variantLabel: pendingTailor.jobContext
        ? `Tailored for ${pendingTailor.jobContext.company || ''} — ${pendingTailor.jobContext.title || ''}`.trim()
        : 'AI Optimized',
      updated: 'just now',
      score: baseResume.score, // Score will be re-calculated if user runs ATS match
    }

    onApply(variant)
  }

  const handleAcceptAll = () => {
    changes.forEach(c => {
      if (!accepted.has(c.id)) toggleAcceptedChange(c.id)
    })
  }

  const handleRejectAll = () => {
    accepted.forEach(id => toggleAcceptedChange(id))
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Review AI Changes</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {acceptedCount} of {totalCount} changes accepted — preview updates live
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={handleAcceptAll}
            className="cursor-pointer rounded-xs border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Accept all
          </button>
          <button
            onClick={handleRejectAll}
            className="cursor-pointer rounded-xs border border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Reject all
          </button>
        </div>
      </div>

      {/* Change list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {changes.map((change) => {
          const isAccepted = accepted.has(change.id)
          return (
            <div
              key={change.id}
              className={cn(
                'rounded-sm border p-3 transition-colors',
                isAccepted ? 'border-primary/30 bg-primary/5' : 'border-border bg-card opacity-60',
              )}
            >
              {/* Toggle row */}
              <div className="flex items-start gap-2">
                <button
                  onClick={() => toggleAcceptedChange(change.id)}
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-colors',
                    isAccepted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground hover:border-primary',
                  )}
                >
                  {isAccepted && <Check size={10} strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                      {change.field}
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{change.label}</span>
                  </div>

                  {/* Before → After */}
                  <div className="space-y-1">
                    {change.before && (
                      <div className="rounded-xs bg-destructive/5 border border-destructive/10 px-2 py-1">
                        <span className="text-[10px] text-muted-foreground line-through opacity-70">
                          {change.before}
                        </span>
                      </div>
                    )}
                    {change.after && (
                      <div className="rounded-xs bg-success/5 border border-success/10 px-2 py-1">
                        <span className="text-[10px] text-foreground">{change.after}</span>
                      </div>
                    )}
                  </div>

                  {/* Rationale */}
                  {change.rationale && (
                    <p className="mt-1 text-[10px] text-muted-foreground italic">
                      {change.rationale}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {changes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[11px] text-muted-foreground">No changes proposed by AI.</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Your resume is already well-optimized.</p>
          </div>
        )}
      </div>

      {/* Footer with apply/cancel */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
        <button
          onClick={handleApply}
          disabled={acceptedCount === 0}
          className="flex-1 cursor-pointer rounded-sm bg-primary px-3 py-2 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply {acceptedCount > 0 ? `${acceptedCount} ` : ''}change{acceptedCount === 1 ? '' : 's'}
        </button>
        <button
          onClick={onCancel}
          className="cursor-pointer rounded-sm border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

### 3D. Rewire the ATS handleTailor to use review mode

**File:** `src/app/components/ats/ats-view.tsx`

First, add `setPendingTailor` to the store destructuring at line 29:

Find:
```typescript
  const { resumes, activeResumeId, setActiveResumeId, updateResume, addResume } = useAppStore()
```

Replace with:
```typescript
  const { resumes, activeResumeId, setActiveResumeId, updateResume, addResume, setPendingTailor } = useAppStore()
```

Now replace the `handleTailor` function (lines 97-144):

Find (lines 97-144):
```typescript
  // ── Tailor Resume using API ──
  const handleTailor = async () => {
    if (!resume || !jdText.trim()) return
    setTailoringLoading(true)
    try {
      const res = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          job: {
            title: 'Target Position',
            company: 'Target Company',
            description: jdText,
          },
        }),
      })
      if (!res.ok) throw new Error('Tailoring failed')
      const { optimized } = await res.json()

      const newResume: Resume = {
        ...resume,
        id: String(Date.now()),
        name: `${resume.name} (${hasAnalysedJd ? 'Tailored' : 'Optimized'})`,
        summary: optimized.summary,
        skills: optimized.skills,
        experience: optimized.experience?.map((e: any, idx: number) => {
          const original = resume.experience?.[idx]
          return {
            company: e.company || original?.company || '',
            role: e.role || original?.role || '',
            dates: e.dates || original?.dates || '',
            bullets: e.bullets || original?.bullets || [],
          }
        }) || resume.experience || [],
        updated: 'just now',
      }

      addResume(newResume)
      setActiveResumeId(newResume.id)
      notify({ message: 'Successfully tailored resume! Redirecting to editor...', type: 'success' })
      router.push(`/resume/${newResume.id}`)
    } catch (err) {
      console.error('[tailor] Error:', err)
      notify({ message: 'Failed to tailor resume. Please try again.', type: 'error' })
    } finally {
      setTailoringLoading(false)
    }
  }
```

Replace with:
```typescript
  // ── Tailor Resume using API ──
  const handleTailor = async () => {
    if (!resume || !jdText.trim()) return
    setTailoringLoading(true)
    try {
      const res = await fetch('/api/ai/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          job: {
            title: 'Target Position',
            company: 'Target Company',
            description: jdText,
          },
        }),
      })
      if (!res.ok) throw new Error('Tailoring failed')
      const { optimized, changes } = await res.json()

      // Build the optimized resume object (preserving fields AI doesn't touch)
      const optimizedResume: Resume = {
        ...resume,
        summary: optimized.summary,
        skills: optimized.skills,
        experience: optimized.experience?.map((e: any, idx: number) => {
          const original = resume.experience?.[idx]
          return {
            company: e.company || original?.company || '',
            role: e.role || original?.role || '',
            dates: e.dates || original?.dates || '',
            bullets: e.bullets || original?.bullets || [],
          }
        }) || resume.experience || [],
      }

      // Store the pending tailor result and navigate to editor in review mode
      const acceptedIds = new Set<string>(changes.map((c: any) => c.id))
      setPendingTailor({
        baseResumeId: resume.id,
        baseResume: resume,
        optimized: optimizedResume,
        changes: changes,
        accepted: acceptedIds,
        jobContext: {
          company: 'Target Company',
          title: 'Target Position',
        },
      })

      notify({ message: 'AI tailored your resume. Review the changes.', type: 'success' })
      router.push(`/resume/${resume.id}?mode=review`)
    } catch (err) {
      console.error('[tailor] Error:', err)
      notify({ message: 'Failed to tailor resume. Please try again.', type: 'error' })
    } finally {
      setTailoringLoading(false)
    }
  }
```

### 3E. Add review mode to the editor

**File:** `src/app/components/resume/resume-detail.tsx`

#### 3E-1. Add imports

At the top of the file, add after the existing imports (after line 34):

```typescript
import { TailorReviewPanel } from '~/components/resume/tailor-review-panel'
```

#### 3E-2. Add review mode state

In the `ResumeDetail` component, after the `const [copilotOpen, setCopilotOpen] = useState(false)` line that you added in Step 2A, add:

```typescript
  // ── Tailor review mode ──
  const { pendingTailor, setPendingTailor, addVariantResume } = useAppStore()
  const isReviewMode = pendingTailor !== null && pendingTailor.baseResumeId === resumeId

  const handleApplyTailor = (variant: Resume) => {
    addVariantResume(variant)
    setPendingTailor(null)
    setActiveResumeId(variant.id)
    notify({ message: 'Tailored variant created!', type: 'success' })
  }

  const handleCancelTailor = () => {
    setPendingTailor(null)
    notify({ message: 'Tailoring cancelled. Your resume is unchanged.', type: 'info' })
  }
```

Note: `useAppStore` is already imported at line 25. The `pendingTailor`, `setPendingTailor`, and `addVariantResume` fields now exist in the store from Step 0C.

Also, update the existing store destructuring at line 339:

Find:
```typescript
  const { getResume, addResume, setActiveResumeId, deleteResume, updateResume } = useAppStore()
```

Replace with:
```typescript
  const { getResume, addResume, setActiveResumeId, deleteResume, updateResume, pendingTailor: storePendingTailor, setPendingTailor, addVariantResume } = useAppStore()
```

And remove the duplicate destructuring you added above (use this one instead). Remove the `const { pendingTailor, setPendingTailor, addVariantResume } = useAppStore()` line you just added, since it's now in line 339.

Then keep:
```typescript
  const isReviewMode = storePendingTailor !== null && storePendingTailor.baseResumeId === resumeId
```

#### 3E-3. Render review mode instead of normal editor when active

In the main return of `ResumeDetail`, find the editor tab section. BEFORE the `{tab === 'editor' && (` block, add a condition for review mode:

Find the line where the editor tab starts (the line `{tab === 'editor' && (` that you added in Step 2B).

Wrap the editor rendering with a review-mode check. Insert this BEFORE the editor tab block:

```typescript
        {/* ── Tab 3: Tailor Review Mode ── */}
        {tab === 'editor' && isReviewMode && (
          <div className="flex w-full flex-col lg:flex-row">
            {/* Change list panel (left) */}
            <div className="w-full lg:w-[45%] overflow-y-auto border-r border-border">
              <TailorReviewPanel onApply={handleApplyTailor} onCancel={handleCancelTailor} />
            </div>
            {/* Live PDF with accepted changes (right) */}
            <div className="hidden lg:flex w-[55%] min-w-[350px] flex-col bg-muted/30">
              <div className="flex-1 min-h-0">
                <ResumePreview resume={reviewPreviewResume} />
              </div>
            </div>
            {/* Mobile fallback */}
            <div className="lg:hidden border-t border-border">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground list-none">
                  <span>Preview PDF (with accepted changes)</span>
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="h-[500px] border-t border-border">
                  <ResumePreview resume={reviewPreviewResume} />
                </div>
              </details>
            </div>
          </div>
        )}
```

Then change the normal editor tab condition from `{tab === 'editor' && (` to `{tab === 'editor' && !isReviewMode && (`.

#### 3E-4. Compute the review preview resume

Before the `return` statement of `ResumeDetail`, add the computation for the review preview:

```typescript
  // ── Review mode: compute previewed resume from accepted changes ──
  const reviewPreviewResume = useMemo(() => {
    if (!pendingTailor) return resume as Resume
    const { baseResume, optimized, changes, accepted } = pendingTailor
    // Start from base
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
  }, [pendingTailor])
```

### 3F. Verification

After this step:
- [ ] Clicking "Tailor Resume with AI" in ATS view fetches changes and navigates to editor in review mode
- [ ] Review mode shows change list on left, live PDF on right
- [ ] Toggling a change (uncheck) updates the PDF to revert that change
- [ ] "Accept all" checks everything; "Reject all" unchecks everything
- [ ] "Apply N changes" creates a variant resume and exits review mode
- [ ] "Cancel" exits review mode without any changes
- [ ] Apply button is disabled when 0 changes accepted
- [ ] The variant resume appears in the sidebar with a label
- [ ] Original resume is NOT modified

---

## Step 4: Variant Grouping in Sidebar

**File:** `src/app/components/layout/sidebar.tsx`

### 4A. Group base resumes and their variants

In the `Sidebar` component, after the line `const totalPipeline = ...` (line 128), add:

```typescript
  // ── Group resumes: base resumes + their variants ──
  const baseResumes = resumes.filter(r => !r.isVariant)
  const variantsByBase = useMemo(() => {
    const map: Record<string, typeof resumes> = {}
    for (const r of resumes) {
      if (r.isVariant && r.baseResumeId) {
        if (!map[r.baseResumeId]) map[r.baseResumeId] = []
        map[r.baseResumeId].push(r)
      }
    }
    return map
  }, [resumes])
```

Add `useMemo` to the import at line 3:

Find:
```typescript
import { useState, useEffect } from 'react'
```

Replace with:
```typescript
import { useState, useEffect, useMemo } from 'react'
```

### 4B. Replace the expanded resume list to show variants nested

Find the expanded resume list block (lines 201-257). Replace the entire block:

Find (line 201) through the closing `</div>` before `{/* ── JOBS ── */}`:

Replace the `{resumes.map((r) => (...)}` loop (lines 207-245) with a grouped version:

```typescript
            <div className="max-h-[200px] overflow-y-auto scrollbar-thin">
              {baseResumes.map((r) => {
                const variants = variantsByBase[r.id] || []
                return (
                  <div key={r.id}>
                    {/* Base resume */}
                    <div
                      className={cn(
                        'group flex items-center gap-1 rounded-sm transition-colors border-l-2',
                        r.id === activeResumeId && pathname === `/resume/${r.id}`
                          ? 'bg-sidebar-active border-l-primary'
                          : 'hover:bg-sidebar-hover border-l-transparent',
                        'px-2 py-1',
                      )}
                    >
                      <button
                        onClick={() => {
                          setActiveResumeId(r.id)
                          router.push(`/resume/${r.id}`)
                        }}
                        className="flex cursor-pointer items-center gap-2 text-xs flex-1 min-w-0"
                      >
                        <span
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full border-2 transition-all',
                            r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground',
                          )}
                        />
                        <span className="flex-1 truncate text-left font-medium">{r.name}</span>
                        <span className="font-mono text-[10px] font-semibold text-success">{r.score}%</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget({ id: r.id, name: r.name })
                        }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer rounded-xs p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete resume"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {/* Variants under this base */}
                    {variants.map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          'group flex items-center gap-1 rounded-sm transition-colors border-l-2 ml-3',
                          v.id === activeResumeId && pathname === `/resume/${v.id}`
                            ? 'bg-sidebar-active border-l-primary/50'
                            : 'hover:bg-sidebar-hover border-l-transparent',
                          'px-2 py-0.5',
                        )}
                      >
                        <button
                          onClick={() => {
                            setActiveResumeId(v.id)
                            router.push(`/resume/${v.id}`)
                          }}
                          className="flex cursor-pointer items-center gap-2 text-xs flex-1 min-w-0"
                        >
                          <span className="shrink-0 text-[9px] text-muted-foreground">└</span>
                          <span className="flex-1 truncate text-left text-[11px] text-muted-foreground">
                            {v.variantLabel || v.name}
                          </span>
                          {v.score > 0 && (
                            <span className="font-mono text-[9px] font-semibold text-success/70">{v.score}%</span>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget({ id: v.id, name: v.variantLabel || v.name })
                          }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer rounded-xs p-0.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Delete variant"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
```

### 4C. Also update the collapsed flyout

Find the collapsed flyout resume list (lines 168-185). Replace `{resumes.map((r) => ...)` with `{baseResumes.map((r) => ...)` and add variant items after each base:

Find (lines 168-185):
```typescript
                    <div className="max-h-[200px] overflow-y-auto">
                      {resumes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setActiveResumeId(r.id)
                            router.push(`/resume/${r.id}`)
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors',
                            r.id === activeResumeId ? 'bg-sidebar-active font-semibold text-foreground' : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                          )}
                        >
                          <span className={cn('h-2 w-2 rounded-full border-2 shrink-0', r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                          <span className="flex-1 truncate text-left">{r.name}</span>
                          <span className="font-mono text-[10px] font-semibold text-success shrink-0">{r.score}%</span>
                        </button>
                      ))}
                    </div>
```

Replace with:
```typescript
                    <div className="max-h-[240px] overflow-y-auto">
                      {baseResumes.map((r) => {
                        const variants = variantsByBase[r.id] || []
                        return (
                          <div key={r.id}>
                            <button
                              onClick={() => {
                                setActiveResumeId(r.id)
                                router.push(`/resume/${r.id}`)
                              }}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors',
                                r.id === activeResumeId ? 'bg-sidebar-active font-semibold text-foreground' : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                              )}
                            >
                              <span className={cn('h-2 w-2 rounded-full border-2 shrink-0', r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                              <span className="flex-1 truncate text-left">{r.name}</span>
                              <span className="font-mono text-[10px] font-semibold text-success shrink-0">{r.score}%</span>
                            </button>
                            {variants.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => {
                                  setActiveResumeId(v.id)
                                  router.push(`/resume/${v.id}`)
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-[11px] transition-colors pl-5',
                                  v.id === activeResumeId ? 'bg-sidebar-active font-semibold text-foreground' : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                                )}
                              >
                                <span className="text-[9px] shrink-0">└</span>
                                <span className="flex-1 truncate text-left">{v.variantLabel || v.name}</span>
                              </button>
                            ))}
                          </div>
                        )
                      })}
                    </div>
```

### 4D. Verification

After this step:
- [ ] Base resumes show in sidebar as before
- [ ] Variants appear indented (└) under their base resume
- [ ] Variants show their label (e.g. "Tailored for Google — SWE")
- [ ] Clicking a variant navigates to its editor
- [ ] Deleting a variant works independently of the base
- [ ] Collapsed flyout also shows variants nested under base

---

## Post-Flight Checklist

Run through ALL of these after every step is complete:

### Type Check
```bash
npx tsc --noEmit
```

### Lint
```bash
pnpm lint
```

### Build
```bash
pnpm build
```

### Manual E2E Test Flow
1. Upload or select an existing resume
2. Open the editor → PDF should be visible on the right, updating as you type
3. Click "Co-Pilot" button in toolbar → drawer slides in → chat works
4. Close drawer → PDF pane is fully visible again
5. Go to ATS Optimizer → paste a JD → click "Tailor Resume with AI"
6. Editor opens in review mode with changes listed on left, PDF on right
7. Toggle changes on/off → PDF updates live
8. Click "Apply N changes" → variant created → appears in sidebar under base resume
9. Go to Applications → paste a job URL (try a Greenhouse board) → card appears in bookmark column

### What NOT to do
- Do NOT add a Chrome extension
- Do NOT add voice interview
- Do NOT create a multi-step wizard for the editor
- Do NOT build a separate diff modal — the review mode IS the diff viewer
- Do NOT edit files in `drizzle/` — no migrations needed
- Do NOT change the `proxy.ts` middleware
- Do NOT modify the auth flow

---

## File Manifest

| File | Action | Step |
|------|--------|------|
| `src/app/types/resume.ts` | EDIT — add variant fields + TailorChange/PendingTailor types | 0A, 0B |
| `src/app/lib/store.tsx` | EDIT — add pendingTailor state + actions | 0C |
| `src/app/components/pipeline/applications-view.tsx` | EDIT — add paste-URL input | 1 |
| `src/app/components/resume/resume-detail.tsx` | EDIT — major: live PDF pane, review mode, Co-Pilot drawer | 2, 3 |
| `src/app/components/resume/resume-copilot.tsx` | EDIT — remove layout wrapper, adapt for drawer | 2C |
| `src/app/api/ai/tailor/route.ts` | EDIT — enrich changes[] schema + prompt | 3A, 3B |
| `src/app/components/ats/ats-view.tsx` | EDIT — rewire handleTailor to review mode | 3D |
| `src/app/components/resume/tailor-review-panel.tsx` | CREATE — new component | 3C |
| `src/app/components/layout/sidebar.tsx` | EDIT — variant grouping | 4 |
```
