# Resume Editor V2 — Complete Implementation Plan

> **For the implementing agent:** Follow every step in order. Do NOT skip steps. Do NOT improvise architecture — the decisions are already made. Write code that matches existing patterns exactly. When you see `EXACT CODE`, copy it verbatim. When you see `PATTERN`, match the described pattern.

---

## Table of Contents

1. [Install Dependencies](#step-1-install-dependencies)
2. [Add Types: sectionOrder + sectionVisibility](#step-2-add-types)
3. [Update Zod Schema](#step-3-update-zod-schema)
4. [Fix Hydration Bug in resume-detail.tsx](#step-4-fix-hydration-bug)
5. [Fix Missing Projects Handler](#step-5-fix-projects-handler)
6. [Create Resizable Panel Component](#step-6-create-resizable-panel)
7. [Create Section Renderer Helper](#step-7-create-section-renderer)
8. [Refactor All 5 PDF Templates to Dynamic Section Order](#step-8-refactor-pdf-templates)
9. [Wire sectionOrder into liveResume + saveChanges](#step-9-wire-sectionorder)
10. [Add Section Visibility Toggles](#step-10-add-visibility-toggles)
11. [Add Debounced Autosave](#step-11-add-autosave)
12. [Replace Static Layout with Resizable Panels](#step-12-replace-layout)
13. [Add Mobile Tab Toggle](#step-13-mobile-tab-toggle)
14. [Add Expand/Collapse PDF Toggle](#step-14-expand-collapse)
15. [Verify Build](#step-15-verify)

---

## STEP 1: Install Dependencies

Run this command in the project root:

```bash
pnpm add react-resizable-panels
```

This is the exact library Reactive Resume v5 uses (`react-resizable-panels@^4.12.1`). It works standalone — NO Radix dependency needed. Your project uses Base UI, not Radix, so do NOT run `npx shadcn add resizable` — it may try to pull Radix. Install the raw library.

Verify it's in `package.json` after install.

---

## STEP 2: Add Types — sectionOrder + sectionVisibility

**File:** `src/app/types/resume.ts`

Find the `Resume` interface (starts at line 72). Add two new fields after `variantLabel?: string`:

```typescript
  // ── Editor layout state (V2) ──
  sectionOrder?: string[]              // Ordered section IDs for PDF rendering + editor DnD
  sectionVisibility?: Record<string, boolean>  // Section ID → visible in PDF. Missing = true.
```

Also add a constant below the `Resume` interface for default section order. Add this AFTER the closing `}` of the `Resume` interface:

```typescript
// Default section order — used when resume.sectionOrder is missing
export const DEFAULT_SECTION_ORDER: string[] = [
  'summary',
  'education',
  'skills',
  'experience',
  'projects',
  'certifications',
  'languages',
  'custom',
]

// Sections that appear in the editor's left panel but NOT in the PDF body
// (basic info is always rendered in the PDF header, not as a section)
export const NON_PDF_SECTIONS = ['basic'] as const
```

---

## STEP 3: Update Zod Schema

**File:** `src/app/lib/schemas.ts`

In the `ResumeDataSchema` object (starts at line 58), add these two fields before `.passthrough()`:

```typescript
  sectionOrder: z.array(z.string().max(50)).max(20).optional(),
  sectionVisibility: z.record(z.string(), z.boolean()).optional(),
```

Put them right after the `coverLetterJD` line and before the closing `}).passthrough()`.

---

## STEP 4: Fix Hydration Bug

**File:** `src/app/components/resume/resume-detail.tsx`

This is the CRITICAL bug: editor loads empty on direct navigation/hard refresh.

### Root Cause
The 14 `useState` calls (lines 350-364) initialize from `resume?.X ?? ''`. On first render, the store hasn't hydrated yet, so `resume` is `undefined`. React never re-runs useState initializers.

### Fix

Add a `hydrated` check from the store. In the `ResumeDetail` function, find where `const { getResume, ... }` destructures from `useAppStore()` (around line 340). Add `hydrated` to the destructure:

```typescript
const { getResume, addResume, setActiveResumeId, deleteResume, updateResume, pendingTailor: storePendingTailor, setPendingTailor, addVariantResume, hydrated } = useAppStore()
```

Then, AFTER all the `useState` declarations (after line 370, after `sectionOrder` state), add this re-sync effect:

```typescript
// ── Re-sync editor state when resume data loads (hydration fix) ──
const lastSyncedId = useRef<string | null>(null)
useEffect(() => {
  if (!hydrated || !resume || lastSyncedId.current === resume.id) return
  lastSyncedId.current = resume.id
  setEditName(resume.name ?? '')
  setEditPersona(resume.persona ?? '')
  setEditEmail(resume.email ?? '')
  setEditLocation(resume.location ?? '')
  setEditPhone(resume.phone ?? '')
  setEditGithub(resume.github ?? '')
  setEditRole(resume.role ?? '')
  setEditSummary(resume.summary ?? '')
  setEditSkillsArr(resume.skills ?? [])
  setEditExperiences(resume.experience ?? [])
  setEditEducations(resume.education ?? [])
  setEditProjectsArr(resume.projects ?? [])
  setEditCertifications(resume.certifications ?? [])
  setEditLanguages(resume.languages ?? [])
  setEditCustomSections(resume.customSections ?? [])
  setSectionOrder(resume.sectionOrder ?? [...ALL_EDITOR_SECTIONS])
}, [hydrated, resume])
```

Then, change the early return at line 850. Find:
```typescript
  if (!resume) {
```
Change to:
```typescript
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
```

This shows a spinner while the store loads, then shows the "not found" only if the resume genuinely doesn't exist after hydration.

---

## STEP 5: Fix Missing Projects Handler

**File:** `src/app/components/resume/resume-detail.tsx`

Find the `handleAddSection` function (around line 794). It's missing a `'projects'` case.

**Current code:**
```typescript
const handleAddSection = useCallback((section: SectionKey) => {
  if (section === 'certifications') {
    setEditCertifications((prev) => [...prev, { name: '', issuer: '', date: '' }])
  } else if (section === 'languages') {
    setEditLanguages((prev) => [...prev, { name: '', proficiency: '' }])
  } else if (section === 'custom') {
    setEditCustomSections((prev) => [...prev, { title: 'New Section', type: 'bullets' as const, items: [], bullets: [] }])
  }
  setShowAddSectionPicker(false)
}, [])
```

**Replace with:**
```typescript
const handleAddSection = useCallback((section: SectionKey) => {
  if (section === 'projects') {
    setEditProjectsArr((prev) => [...prev, { name: '', description: '', techStack: [], link: '' }])
  } else if (section === 'certifications') {
    setEditCertifications((prev) => [...prev, { name: '', issuer: '', date: '' }])
  } else if (section === 'languages') {
    setEditLanguages((prev) => [...prev, { name: '', proficiency: '' }])
  } else if (section === 'custom') {
    setEditCustomSections((prev) => [...prev, { title: 'New Section', type: 'bullets' as const, items: [], bullets: [] }])
  }
  setShowAddSectionPicker(false)
}, [])
```

---

## STEP 6: Create Resizable Panel Component

**New file:** `src/app/components/ui/resizable.tsx`

This is a thin wrapper around `react-resizable-panels` that matches your existing Base UI component style.

```tsx
'use client'

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from 'react-resizable-panels'
import { cn } from '~/lib/utils'

// Wrapper components that match the project's existing UI patterns
export function ResizableGroup({ className, ...props }: PanelGroupProps) {
  return <PanelGroup className={cn('flex h-full w-full', className)} {...props} />
}

export function ResizablePanel({ className, ...props }: PanelProps) {
  return <Panel className={className} {...props} />
}

export function ResizableHandle({ className, ...props }: PanelResizeHandleProps) {
  return (
    <PanelResizeHandle
      className={cn(
        'relative flex w-1.5 items-center justify-center bg-border transition-colors',
        'hover:bg-primary/40 active:bg-primary/60',
        'after:absolute after:h-8 after:w-1 after:rounded-full after:bg-muted-foreground/30',
        'hover:after:bg-primary after:transition-colors',
        'data-[resize-handle-state=drag]:bg-primary data-[resize-handle-state=drag]:after:bg-primary',
        'hidden lg:flex',  // Hidden on mobile — mobile uses tab toggle
        className,
      )}
      {...props}
    />
  )
}

// Re-export for convenience
export { Panel, PanelGroup, PanelResizeHandle }
```

---

## STEP 7: Create Section Renderer Helper

This is the KEY abstraction that makes section reordering work in PDF templates. Instead of each template hardcoding section order, they'll call a shared function.

**New file:** `src/app/components/resume/templates/render-sections.tsx`

```tsx
import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Resume, ResumeExperience, ResumeEducation, ResumeProject, ResumeCertification, ResumeLanguage, ResumeCustomSection } from '~/types/resume'
import { DEFAULT_SECTION_ORDER } from '~/types/resume'
import { COLORS } from './shared-pdf'

// ── Types ──

export interface SectionStyleSet {
  section: React.CSSProperties
  sectionTitle: React.CSSProperties
  summary: React.CSSProperties
  experienceBlock: React.CSSProperties
  expHeader: React.CSSProperties
  expRole: React.CSSProperties
  expDates: React.CSSProperties
  expCompany: React.CSSProperties
  bullet: React.CSSProperties
  skillsRow: React.CSSProperties
  skill: React.CSSProperties
  languagesRow: React.CSSProperties
  langText: React.CSSProperties
  projectTech: React.CSSProperties
  skillBadge?: React.CSSProperties
  skillsCol?: React.CSSProperties
}

// ── Section visibility helper ──

/**
 * Returns the list of section IDs that should be rendered in the PDF,
 * in the correct order, respecting sectionOrder and sectionVisibility.
 * Excludes 'basic' (rendered in header) and sections with no data.
 */
export function getVisiblePdfSections(resume: Resume): string[] {
  const order = resume.sectionOrder ?? DEFAULT_SECTION_ORDER

  return order.filter((id) => {
    if (id === 'basic') return false  // basic info is in the header, not a section

    // Check visibility flag (missing = visible)
    if (resume.sectionVisibility && resume.sectionVisibility[id] === false) {
      return false
    }

    // Check if section has data
    switch (id) {
      case 'summary': return !!resume.summary?.trim()
      case 'skills': return (resume.skills?.length ?? 0) > 0
      case 'experience': return (resume.experience?.length ?? 0) > 0
      case 'education': return (resume.education?.length ?? 0) > 0
      case 'projects': return (resume.projects?.length ?? 0) > 0
      case 'certifications': return (resume.certifications?.length ?? 0) > 0
      case 'languages': return (resume.languages?.length ?? 0) > 0
      case 'custom': return (resume.customSections?.length ?? 0) > 0
      default: return false
    }
  })
}

// ── Individual section renderers ──

function SummarySection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Summary</Text>
      <Text style={s.summary}>{resume.summary}</Text>
    </View>
  )
}

function EducationSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Education</Text>
      {resume.education!.map((edu: ResumeEducation, i: number) => (
        <View key={i} style={s.experienceBlock}>
          <View style={s.expHeader}>
            <Text style={s.expRole}>{edu.institution}</Text>
            <Text style={s.expDates}>{edu.dates}</Text>
          </View>
          <Text style={s.expCompany}>
            {[edu.degree, edu.field].filter(Boolean).join(', ')}
          </Text>
        </View>
      ))}
    </View>
  )
}

function SkillsSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  // If skillBadge style exists (sidebar-style), use it; otherwise inline tags
  if (s.skillsCol && s.skillBadge) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Skills</Text>
        <View style={s.skillsCol}>
          {resume.skills.map((skill: string, i: number) => (
            <Text key={i} style={s.skillBadge}>{skill}</Text>
          ))}
        </View>
      </View>
    )
  }
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Skills</Text>
      <View style={s.skillsRow}>
        {resume.skills.map((skill: string, i: number) => (
          <Text key={i} style={s.skill}>{skill}</Text>
        ))}
      </View>
    </View>
  )
}

function ExperienceSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Experience</Text>
      {resume.experience!.map((exp: ResumeExperience, i: number) => (
        <View key={i} style={s.experienceBlock}>
          <View style={s.expHeader}>
            <Text style={s.expRole}>{exp.role}</Text>
            <Text style={s.expDates}>{exp.dates}</Text>
          </View>
          <Text style={s.expCompany}>{exp.company}</Text>
          {exp.bullets.map((b: string, j: number) => (
            <Text key={j} style={s.bullet}>• {b}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function ProjectsSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Projects</Text>
      {resume.projects!.map((proj: ResumeProject, i: number) => (
        <View key={i} style={s.experienceBlock}>
          <View style={s.expHeader}>
            <Text style={s.expRole}>
              {proj.name}{proj.link ? ` (${proj.link})` : ''}
            </Text>
          </View>
          <Text style={s.summary}>{proj.description}</Text>
          {proj.techStack && proj.techStack.length > 0 && (
            <Text style={s.projectTech}>
              Tech Stack: {proj.techStack.join(', ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

function CertificationsSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Certifications</Text>
      {resume.certifications!.map((cert: ResumeCertification, i: number) => (
        <View key={i} style={{ marginBottom: 2 }}>
          <View style={s.expHeader}>
            <Text style={{ fontWeight: 600, fontSize: 9 }}>
              {cert.name} ({cert.issuer})
            </Text>
            <Text style={s.expDates}>{cert.date}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function LanguagesSection({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Languages</Text>
      <View style={s.languagesRow}>
        {resume.languages!.map((lang: ResumeLanguage, i: number) => (
          <Text key={i} style={s.langText}>
            {lang.name} ({lang.proficiency})
          </Text>
        ))}
      </View>
    </View>
  )
}

function CustomSectionsRenderer({ resume, s }: { resume: Resume; s: SectionStyleSet }) {
  return (
    <>
      {resume.customSections!.map((sec: ResumeCustomSection, i: number) => (
        <View key={i} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          {sec.items && sec.items.length > 0 ? (
            sec.items.map((item, j) => (
              <View key={j} style={{ marginBottom: 4 }}>
                {(item.title || item.subtitle) && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 9, fontWeight: 600, color: COLORS.ink }}>
                      {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}
                    </Text>
                    {item.date ? <Text style={{ fontSize: 8, color: COLORS.muted }}>{item.date}</Text> : null}
                  </View>
                )}
                {item.description ? (
                  <Text style={{ fontSize: 9, color: COLORS.muted }}>• {item.description}</Text>
                ) : null}
                {item.link ? (
                  <Text style={{ fontSize: 8, color: '#5B6ABF' }}>{item.link}</Text>
                ) : null}
              </View>
            ))
          ) : (
            sec.bullets.map((b: string, j: number) => (
              <Text key={j} style={s.bullet}>• {b}</Text>
            ))
          )}
        </View>
      ))}
    </>
  )
}

// ── Main: render sections in dynamic order ──

export function renderPdfSections(resume: Resume, s: SectionStyleSet): React.ReactNode[] {
  const visibleSections = getVisiblePdfSections(resume)
  return visibleSections.map((id) => {
    switch (id) {
      case 'summary': return <SummarySection key={id} resume={resume} s={s} />
      case 'education': return <EducationSection key={id} resume={resume} s={s} />
      case 'skills': return <SkillsSection key={id} resume={resume} s={s} />
      case 'experience': return <ExperienceSection key={id} resume={resume} s={s} />
      case 'projects': return <ProjectsSection key={id} resume={resume} s={s} />
      case 'certifications': return <CertificationsSection key={id} resume={resume} s={s} />
      case 'languages': return <LanguagesSection key={id} resume={resume} s={s} />
      case 'custom': return <CustomSectionsRenderer key={id} resume={resume} s={s} />
      default: return null
    }
  })
}

// ── Sidebar section renderer (for 2-column templates) ──
// Sidebar sections (skills, languages, certifications) use different styles
// and render in a sidebar column. They also respect sectionOrder + visibility.

export function renderSidebarSections(
  resume: Resume,
  sidebarStyles: {
    sidebarSection: React.CSSProperties
    sidebarSectionTitle: React.CSSProperties
    skillBadge?: React.CSSProperties
    skillsCol?: React.CSSProperties
    langText: React.CSSProperties
    certItem?: React.CSSProperties
  },
  sidebarSectionIds?: string[]  // defaults to ['skills', 'languages', 'certifications']
): React.ReactNode[] {
  const order = resume.sectionOrder ?? DEFAULT_SECTION_ORDER
  const defaultSidebarIds = ['skills', 'languages', 'certifications']
  const ids = sidebarSectionIds ?? defaultSidebarIds

  // Filter to sidebar sections, respecting order + visibility
  const visibleIds = order.filter((id) => {
    if (!ids.includes(id)) return false
    if (resume.sectionVisibility && resume.sectionVisibility[id] === false) return false
    switch (id) {
      case 'skills': return (resume.skills?.length ?? 0) > 0
      case 'languages': return (resume.languages?.length ?? 0) > 0
      case 'certifications': return (resume.certifications?.length ?? 0) > 0
      default: return false
    }
  })

  return visibleIds.map((id) => {
    switch (id) {
      case 'skills':
        return (
          <View key={id} style={sidebarStyles.sidebarSection}>
            <Text style={sidebarStyles.sidebarSectionTitle}>Skills</Text>
            {sidebarStyles.skillsCol && sidebarStyles.skillBadge ? (
              <View style={sidebarStyles.skillsCol}>
                {resume.skills!.map((skill: string, i: number) => (
                  <Text key={i} style={sidebarStyles.skillBadge}>{skill}</Text>
                ))}
              </View>
            ) : (
              resume.skills!.map((skill: string, i: number) => (
                <Text key={i} style={sidebarStyles.langText}>{skill}</Text>
              ))
            )}
          </View>
        )
      case 'languages':
        return (
          <View key={id} style={sidebarStyles.sidebarSection}>
            <Text style={sidebarStyles.sidebarSectionTitle}>Languages</Text>
            {resume.languages!.map((lang: ResumeLanguage, i: number) => (
              <Text key={i} style={sidebarStyles.langText}>
                {lang.name} — {lang.proficiency}
              </Text>
            ))}
          </View>
        )
      case 'certifications':
        return (
          <View key={id} style={sidebarStyles.sidebarSection}>
            <Text style={sidebarStyles.sidebarSectionTitle}>Certifications</Text>
            {resume.certifications!.map((cert: ResumeCertification, i: number) => (
              <View key={i} style={sidebarStyles.certItem ?? { marginBottom: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: 600 }}>{cert.name}</Text>
                <Text style={{ fontSize: 8, color: COLORS.muted }}>{cert.issuer} · {cert.date}</Text>
              </View>
            ))}
          </View>
        )
      default: return null
    }
  })
}

// ── Main column section renderer (for 2-column templates) ──
// Like renderPdfSections but EXCLUDES sidebar sections (skills, languages, certifications)

export function renderMainSections(resume: Resume, s: SectionStyleSet): React.ReactNode[] {
  const sidebarIds = ['skills', 'languages', 'certifications']
  const visibleSections = getVisiblePdfSections(resume)
    .filter((id) => !sidebarIds.includes(id))

  return visibleSections.map((id) => {
    switch (id) {
      case 'summary': return <SummarySection key={id} resume={resume} s={s} />
      case 'education': return <EducationSection key={id} resume={resume} s={s} />
      case 'experience': return <ExperienceSection key={id} resume={resume} s={s} />
      case 'projects': return <ProjectsSection key={id} resume={resume} s={s} />
      case 'custom': return <CustomSectionsRenderer key={id} resume={resume} s={s} />
      default: return null
    }
  })
}
```

---

## STEP 8: Refactor All 5 PDF Templates

Each template must use the shared section renderer instead of hardcoded section order.

### Strategy

For **single-column templates** (minimalist, classic): replace the body sections with `renderPdfSections(resume, styles)`.

For **two-column templates** (modern, executive, photo): sidebar sections use `renderSidebarSections()`, main sections use `renderMainSections()`.

### 8A: Minimalist Template

**File:** `src/app/components/resume/templates/minimalist-pdf.tsx`

1. Add import at top:
```typescript
import { renderPdfSections, type SectionStyleSet } from './render-sections'
```

2. Build the style set from the existing `styles` object. Add this BEFORE the `return (` of the component:
```typescript
const sectionStyles: SectionStyleSet = {
  section: styles.section,
  sectionTitle: styles.sectionTitle,
  summary: styles.summary,
  experienceBlock: styles.experienceBlock,
  expHeader: styles.expHeader,
  expRole: styles.expRole,
  expDates: styles.expDates,
  expCompany: styles.expCompany,
  bullet: styles.bullet,
  skillsRow: styles.skillsRow,
  skill: styles.skill,
  languagesRow: styles.languagesRow,
  langText: styles.langText,
  projectTech: styles.projectTech,
}
```

3. Replace everything between the closing `</View>` of the header and the closing `</Page>` with:
```tsx
        {/* Dynamic sections — order controlled by resume.sectionOrder */}
        {renderPdfSections(resume, sectionStyles)}
```

That means DELETE all the hardcoded section blocks (Summary, Education, Skills, Experience, Projects, Certifications, Languages, Custom Sections) and replace with the single `renderPdfSections()` call. Keep the header (name/role/contact) as-is.

### 8B: Classic Template

**File:** `src/app/components/resume/templates/classic-pdf.tsx`

Same pattern as Minimalist. Import `renderPdfSections` and `SectionStyleSet`. Build the style set using Classic's style names. Replace body sections with `renderPdfSections(resume, sectionStyles)`.

Note: Classic uses `styles.sectionTitle` with `textAlign: 'center'` — that stays as-is in the style object.

The style set:
```typescript
const sectionStyles: SectionStyleSet = {
  section: styles.section,
  sectionTitle: styles.sectionTitle,
  summary: styles.summary,
  experienceBlock: styles.experienceBlock,
  expHeader: styles.expHeader,
  expRole: styles.expRole,
  expDates: styles.expDates,
  expCompany: styles.expCompany,
  bullet: styles.bullet,
  skillsRow: styles.skillsRow,
  skill: styles.skill,  // Classic uses dot separators, but renderer uses individual Text elements — that's fine
  languagesRow: styles.languagesRow,
  langText: styles.langText,
  projectTech: styles.projectTech,
}
```

### 8C: Modern Template (Two-Column)

**File:** `src/app/components/resume/templates/modern-pdf.tsx`

1. Add imports:
```typescript
import { renderMainSections, renderSidebarSections, type SectionStyleSet } from './render-sections'
```

2. Build style sets:
```typescript
const mainStyles: SectionStyleSet = {
  section: styles.mainSection,
  sectionTitle: styles.mainSectionTitle,
  summary: styles.summary,
  experienceBlock: styles.experienceBlock,
  expHeader: styles.expHeader,
  expRole: styles.expRole,
  expDates: styles.expDates,
  expCompany: styles.expCompany,
  bullet: styles.bullet,
  skillsRow: styles.skillsRow,
  skill: styles.skillBadge,
  languagesRow: styles.languagesRow,
  langText: styles.langText,
  projectTech: styles.projectTech,
}

const sidebarStyles = {
  sidebarSection: styles.sidebarSection,
  sidebarSectionTitle: styles.sidebarSectionTitle,
  skillBadge: styles.skillBadge,
  skillsCol: styles.skillsCol,
  langText: styles.langText,
  certItem: styles.certItem,
}
```

3. Replace the sidebar content (Skills, Languages, Certifications sections) with:
```tsx
{renderSidebarSections(resume, sidebarStyles)}
```
Keep the Contact section in the sidebar as-is (it's not a draggable section).

4. Replace the main column content (Summary, Education, Experience, Projects, Custom) with:
```tsx
{renderMainSections(resume, mainStyles)}
```

### 8D: Executive Template (Two-Column)

**File:** `src/app/components/resume/templates/executive-pdf.tsx`

Same pattern as Modern. The sidebar has Skills, Languages, Certifications. Main has Summary, Education, Experience, Projects, Custom.

Style set for sidebar:
```typescript
const sidebarStyles = {
  sidebarSection: styles.sidebarSection,
  sidebarSectionTitle: styles.sidebarSectionTitle,
  langText: styles.langText,
  certItem: styles.certItem,
}
```
Note: Executive doesn't have `skillBadge` style — it renders skills as list items. The `renderSidebarSections` function handles this: if `skillBadge` is missing, it falls back to rendering skills as plain text using `langText` style. BUT you need to add a `skillItem` style to the renderer. Actually, use this approach:

For Executive, add this to the sidebar styles:
```typescript
const sidebarStyles = {
  sidebarSection: styles.sidebarSection,
  sidebarSectionTitle: styles.sidebarSectionTitle,
  skillBadge: styles.skillItem,  // Executive uses skillItem style
  skillsCol: { flexDirection: 'column' as const, gap: 3 },
  langText: styles.langText,
  certItem: styles.certItem,
}
```

For main sections:
```typescript
const mainStyles: SectionStyleSet = {
  section: styles.mainSection,
  sectionTitle: styles.mainSectionTitle,
  summary: styles.summary,
  experienceBlock: styles.experienceBlock,
  expHeader: styles.expHeader,
  expRole: styles.expRole,
  expDates: styles.expDates,
  expCompany: styles.expCompany,
  bullet: styles.bullet,
  skillsRow: styles.skillsRow,
  skill: styles.skillItem,
  languagesRow: styles.languagesRow,
  langText: styles.langText,
  projectTech: styles.projectTech,
}
```

### 8E: Photo Template (Two-Column)

**File:** `src/app/components/resume/templates/photo-pdf.tsx`

Same pattern as Modern. Sidebar has Contact (keep), Skills, Languages, Certifications. Main has name/role, Summary, Education, Experience, Projects, Custom.

Style sets:
```typescript
const mainStyles: SectionStyleSet = {
  section: styles.mainSection,
  sectionTitle: styles.mainSectionTitle,
  summary: styles.summary,
  experienceBlock: styles.experienceBlock,
  expHeader: styles.expHeader,
  expRole: styles.expRole,
  expDates: styles.expDates,
  expCompany: styles.expCompany,
  bullet: styles.bullet,
  skillsRow: styles.skillsRow,
  skill: styles.skillBadge,
  languagesRow: styles.languagesRow,
  langText: styles.langText,
  projectTech: styles.projectTech,
}

const sidebarStyles = {
  sidebarSection: styles.sidebarSection,
  sidebarSectionTitle: styles.sidebarSectionTitle,
  skillBadge: styles.skillBadge,
  skillsCol: styles.skillsCol,
  langText: styles.langText,
  certItem: styles.certItem,
}
```

---

## STEP 9: Wire sectionOrder into liveResume + saveChanges

**File:** `src/app/components/resume/resume-detail.tsx`

### 9A: Update liveResume

Find `const liveResume: Resume = useMemo(...)` (around line 748). Add `sectionOrder` and `sectionVisibility` to the object:

```typescript
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
  sectionOrder,
  sectionVisibility,
}), [
  resume,
  editName, editPersona, editRole, editEmail, editPhone, editLocation, editGithub,
  editSummary, editSkillsArr, editExperiences, editEducations, editProjectsArr,
  editCertifications, editLanguages, editCustomSections,
  sectionOrder, sectionVisibility,
])
```

### 9B: Update saveChanges

Find `const saveChanges = () => {` (around line 858). Add the two new fields:

```typescript
const saveChanges = () => {
  updateResume(resume.id, {
    name: editName,
    persona: editPersona,
    role: editRole,
    email: editEmail,
    location: editLocation,
    phone: editPhone,
    github: editGithub,
    summary: editSummary,
    skills: editSkillsArr,
    experience: editExperiences,
    education: editEducations,
    projects: editProjectsArr,
    certifications: editCertifications,
    languages: editLanguages,
    customSections: editCustomSections,
    sectionOrder,
    sectionVisibility,
  })
  notify({ message: 'Resume saved', type: 'success' })
}
```

---

## STEP 10: Add Section Visibility Toggles

**File:** `src/app/components/resume/resume-detail.tsx`

### 10A: Add sectionVisibility state

Near the other useState declarations (around line 370), add:

```typescript
const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(
  resume?.sectionVisibility ?? {}
)
```

### 10B: Add toggle function

After the `handleSectionDragEnd` function (around line 384), add:

```typescript
const toggleSectionVisibility = useCallback((sectionId: EditorSectionId) => {
  setSectionVisibility(prev => ({
    ...prev,
    [sectionId]: prev[sectionId] === false ? true : false,
  }))
}, [])
```

### 10C: Add eye toggle to SortableSection

Find the `SortableSection` component (around line 305). It currently renders a drag handle and children. Add a visibility toggle button.

Change the component to accept an `isVisible` prop and `onToggleVisible` callback:

```tsx
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
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1.5 shrink-0 cursor-grab text-muted-foreground/50 opacity-80 group-hover/section:opacity-100 transition-all hover:text-foreground/80 active:cursor-grabbing hover:scale-110"
          title="Drag to reorder section"
        >
          <GripVertical size={14} />
        </button>
        <div className={cn('flex-1 min-w-0 transition-opacity', !isVisible && 'opacity-40')}>
          {children}
        </div>
        {onToggleVisible && (
          <button
            type="button"
            onClick={onToggleVisible}
            className="mt-1.5 shrink-0 cursor-pointer text-muted-foreground/50 opacity-0 group-hover/section:opacity-100 transition-all hover:text-foreground"
            title={isVisible ? 'Hide from PDF' : 'Show in PDF'}
          >
            {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}
```

### 10D: Update visibleEditorSections

The current `visibleEditorSections` (line 387) HIDES sections with no data. Change it to show ALL sections that the user has added (even if empty), so they can toggle visibility.

```typescript
const visibleEditorSections = sectionOrder.filter((id) => {
  switch (id) {
    case 'basic': case 'summary': case 'skills': case 'experience': case 'education':
      return true
    case 'projects': return editProjectsArr.length > 0
    case 'certifications': return editCertifications.length > 0
    case 'languages': return editLanguages.length > 0
    case 'custom': return editCustomSections.length > 0
    default: return false
  }
})
```

This stays the same — sections with data show in the editor. But the PDF respects `sectionVisibility`.

### 10E: Wire toggle into SortableSection usage

Find where `SortableSection` is rendered in the DnD context (around line 1085). Update each rendering:

```tsx
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
```

### 10F: Add Eye / EyeOff to imports

At the top of the file, update the lucide-react import to add `Eye` and `EyeOff`:

```typescript
import { ArrowLeft, Wand2, Download, Trash2, Plus, X, PlusCircle, Lightbulb, GripVertical, ChevronDown, ChevronUp, Sparkles, Eye, EyeOff } from 'lucide-react'
```

---

## STEP 11: Add Debounced Autosave

**File:** `src/app/components/resume/resume-detail.tsx`

### 11A: Add save status state

Near the other useState declarations, add:

```typescript
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
```

### 11B: Add debounced autosave effect

After the `liveResume` useMemo and `deferredResume` declaration, add:

```typescript
// ── Debounced autosave ──
const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const lastSavedSnapshotRef = useRef<string>('')

useEffect(() => {
  if (!hydrated || !resume || isReviewMode) return

  // Serialize current state to detect changes
  const snapshot = JSON.stringify({
    name: editName, persona: editPersona, role: editRole,
    email: editEmail, phone: editPhone, location: editLocation, github: editGithub,
    summary: editSummary, skills: editSkillsArr,
    experience: editExperiences, education: editEducations,
    projects: editProjectsArr, certifications: editCertifications,
    languages: editLanguages, customSections: editCustomSections,
    sectionOrder, sectionVisibility,
  })

  // No changes since last save
  if (snapshot === lastSavedSnapshotRef.current) return

  // Mark as dirty
  if (saveStatus === 'idle') setSaveStatus('saving')

  // Clear previous timer
  if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)

  // Debounce: save 1.5s after last change
  autosaveTimerRef.current = setTimeout(() => {
    lastSavedSnapshotRef.current = snapshot
    setSaveStatus('saving')
    updateResume(resume.id, {
      name: editName, persona: editPersona, role: editRole,
      email: editEmail, phone: editPhone, location: editLocation, github: editGithub,
      summary: editSummary, skills: editSkillsArr,
      experience: editExperiences, education: editEducations,
      projects: editProjectsArr, certifications: editCertifications,
      languages: editLanguages, customSections: editCustomSections,
      sectionOrder, sectionVisibility,
    })
    setSaveStatus('saved')

    // Reset to idle after 3s
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, 1500)

  return () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
  }
}, [
  hydrated, resume, isReviewMode,
  editName, editPersona, editRole, editEmail, editPhone, editLocation, editGithub,
  editSummary, editSkillsArr, editExperiences, editEducations, editProjectsArr,
  editCertifications, editLanguages, editCustomSections,
  sectionOrder, sectionVisibility,
])
```

### 11C: Initialize snapshot when resume loads

In the hydration sync effect (from Step 4), after setting all the state, add:

```typescript
lastSavedSnapshotRef.current = JSON.stringify({
  name: resume.name ?? '', persona: resume.persona ?? '', role: resume.role ?? '',
  email: resume.email ?? '', phone: resume.phone ?? '', location: resume.location ?? '', github: resume.github ?? '',
  summary: resume.summary ?? '', skills: resume.skills ?? [],
  experience: resume.experience ?? [], education: resume.education ?? [],
  projects: resume.projects ?? [], certifications: resume.certifications ?? [],
  languages: resume.languages ?? [], customSections: resume.customSections ?? [],
  sectionOrder: resume.sectionOrder ?? [...ALL_EDITOR_SECTIONS], sectionVisibility: resume.sectionVisibility ?? {},
})
```

### 11D: Replace Save button with save indicator

Find the toolbar section with the "Save Changes" button (around line 1039-1043). Replace the save button with a save status indicator:

```tsx
{/* Save status indicator */}
<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
  {saveStatus === 'saving' && (
    <>
      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-border border-t-primary" />
      <span>Saving…</span>
    </>
  )}
  {saveStatus === 'saved' && (
    <>
      <div className="h-2 w-2 rounded-full bg-green-500" />
      <span>Saved</span>
    </>
  )}
  {saveStatus === 'idle' && (
    <>
      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <span>Auto-saved</span>
    </>
  )}
</div>
```

Keep the "Save as New" button and "AI Optimize" button as they are. Delete the old "Save Changes" button.

---

## STEP 12: Replace Static Layout with Resizable Panels

**File:** `src/app/components/resume/resume-detail.tsx`

### 12A: Add import

At top of file:
```typescript
import { ResizableGroup, ResizablePanel, ResizableHandle } from '~/components/ui/resizable'
```

### 12B: Add panel state

Near other state:
```typescript
const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
```

### 12C: Replace editor tab layout

Find the editor tab section (around line 1034). The current layout is:
```tsx
{tab === 'editor' && !isReviewMode && (
  <div className="flex w-full flex-col lg:flex-row">
    {/* Form editor (left) */}
    <div className="flex w-full lg:w-[55%] flex-col gap-3 overflow-y-auto border-r border-border p-4 md:p-6">
      ...toolbar...
      ...form body...
    </div>
    {/* Live PDF preview (right) — hidden on mobile */}
    <div className="hidden lg:flex w-[45%] min-w-[350px] flex-col bg-muted/30">
      <div className="flex-1 min-h-0">
        <ResumePreview resume={deferredResume} />
      </div>
    </div>
    {/* Mobile PDF toggle */}
    ...
  </div>
)}
```

**Replace the ENTIRE block** (from `{tab === 'editor' && !isReviewMode && (` to its closing `)}`) with:

```tsx
{tab === 'editor' && !isReviewMode && (
  <>
    {/* Mobile tab toggle */}
    <div className="flex shrink-0 border-b border-border bg-card lg:hidden">
      <button
        onClick={() => setMobileView('edit')}
        className={cn('flex-1 py-2 text-[11px] font-medium', mobileView === 'edit' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}
      >
        ✏️ Edit
      </button>
      <button
        onClick={() => setMobileView('preview')}
        className={cn('flex-1 py-2 text-[11px] font-medium', mobileView === 'preview' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}
      >
        📄 Preview
      </button>
    </div>

    {/* Desktop: resizable panels */}
    <div className="hidden lg:flex flex-1 min-h-0">
      <ResizableGroup direction="horizontal" autoSaveId="resume-editor-panels">
        {/* Form editor (left) */}
        <ResizablePanel defaultSize={55} minSize={30} maxSize={80}>
          <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 md:p-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between rounded-sm border border-border bg-card p-2 px-3">
              <div className="flex gap-2">
                {/* Save status indicator */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {saveStatus === 'saving' && (
                    <>
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border border-border border-t-primary" />
                      <span>Saving…</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Saved</span>
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
                <button onClick={() => {
                  const copy = { ...resume, id: crypto.randomUUID(), name: `${resume.name} (Copy)`, updated: 'just now' }
                  addResume(copy)
                  setActiveResumeId(copy.id)
                  notify({ message: 'Resume cloned', type: 'success' })
                }} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted">
                  Save as New
                </button>
                <button onClick={handleOptimize} disabled={optimizing} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50">
                  <Wand2 size={11} /> {optimizing ? 'Optimizing…' : 'AI Optimize'}
                </button>
                <button
                  onClick={() => setCopilotOpen(true)}
                  className={cn('flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-muted', copilotOpen && 'opacity-50')}
                >
                  <Sparkles size={11} /> Co-Pilot
                </button>
              </div>
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
                            onClick={() => { handleAddSection(s); setShowAddSectionPicker(false) }}
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
        </ResizablePanel>

        <ResizableHandle />

        {/* Live PDF preview (right) */}
        <ResizablePanel defaultSize={45} minSize={20} maxSize={70} collapsible={true} collapsedSize={0}>
          <div className="h-full bg-muted/30">
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
          <div className="flex items-center justify-between rounded-sm border border-border bg-card p-2 px-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {saveStatus === 'saving' && <span>Saving…</span>}
              {saveStatus === 'saved' && <span className="text-green-600">Saved</span>}
              {saveStatus === 'idle' && <span>Auto-saved</span>}
            </div>
            <button onClick={handleOptimize} disabled={optimizing} className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-50">
              <Wand2 size={11} /> {optimizing ? '…' : 'AI'}
            </button>
          </div>

          {/* Form body — same as desktop */}
          <div className="resume-paper rounded-xs p-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
            <div className="flex flex-col gap-3">
              {!suggestionDismissed && (
                <SectionSuggestionBanner suggestions={suggestions} onAdd={handleAddSection} onDismiss={() => setSuggestionDismissed(true)} />
              )}
              <DndContext sensors={sectionSensors} collisionDetection={pointerWithin} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={visibleEditorSections} strategy={verticalListSortingStrategy}>
                  {visibleEditorSections.map((id) => (
                    <SortableSection key={id} id={id} isVisible={sectionVisibility[id] !== false} onToggleVisible={() => toggleSectionVisibility(id)}>
                      {renderEditorSection(id)}
                    </SortableSection>
                  ))}
                </SortableContext>
              </DndContext>
              {availableSections.length > 0 && (
                <div className="relative border-t border-border/50 pt-3">
                  <button type="button" onClick={() => setShowAddSectionPicker(!showAddSectionPicker)} className="flex cursor-pointer items-center gap-1 rounded-xs border border-dashed border-border bg-transparent px-3 py-2 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-all w-full justify-center">
                    <PlusCircle size={13} /> Add Section
                  </button>
                  {showAddSectionPicker && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xs border border-border bg-card shadow-lg">
                      {availableSections.map((s) => (
                        <button key={s} type="button" onClick={() => { handleAddSection(s); setShowAddSectionPicker(false) }} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[11px] text-left text-foreground hover:bg-muted">
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
      )}
      {mobileView === 'preview' && (
        <div className="h-full bg-muted/30">
          <ResumePreview resume={deferredResume} />
        </div>
      )}
    </div>
  </>
)}
```

---

## STEP 13: Mobile Tab Toggle

This is already handled in Step 12 — the mobile toggle buttons and conditional rendering are included. No additional work needed.

---

## STEP 14: Expand/Collapse PDF Toggle

This is already handled in Step 12 via the `collapsible={true}` and `collapsedSize={0}` props on the right `ResizablePanel`. When the user drags the handle all the way to the left, the editor panel collapses. When dragged right, the PDF panel collapses.

You can ALSO double-click the resize handle to toggle collapse (this is built into `react-resizable-panels`).

No additional code needed.

---

## STEP 15: Verify Build

After all changes, run:

```bash
npx tsc --noEmit
```

Fix any TypeScript errors. Common issues:
- Missing import for `Eye`, `EyeOff` from lucide-react
- Missing import for `ResizableGroup`, `ResizablePanel`, `ResizableHandle`
- `renderPdfSections` or `renderMainSections` import path wrong
- `SectionStyleSet` type not exported properly

Then run:

```bash
pnpm build
```

Then test manually:
1. `pnpm dev`
2. Navigate to a resume editor page
3. Verify: editor loads with data (hydration fix)
4. Drag a section → PDF should update order in real-time
5. Click eye icon → section should disappear from PDF
6. Drag panel divider → panels should resize
7. Double-click divider → one panel should collapse
8. Type in a field → see "Saving…" → "Saved" indicator
9. Refresh page → section order + visibility persists
10. Switch to mobile view → tab toggle works (Edit / Preview)

---

## Summary of All Files Changed

| # | File | Action |
|---|------|--------|
| 1 | `package.json` | Add `react-resizable-panels` |
| 2 | `src/app/types/resume.ts` | Add `sectionOrder`, `sectionVisibility` fields + constants |
| 3 | `src/app/lib/schemas.ts` | Add Zod validation for new fields |
| 4 | `src/app/components/ui/resizable.tsx` | **NEW** — resizable panel wrapper |
| 5 | `src/app/components/resume/templates/render-sections.tsx` | **NEW** — shared section renderer |
| 6 | `src/app/components/resume/templates/minimalist-pdf.tsx` | Use `renderPdfSections()` |
| 7 | `src/app/components/resume/templates/classic-pdf.tsx` | Use `renderPdfSections()` |
| 8 | `src/app/components/resume/templates/modern-pdf.tsx` | Use `renderSidebarSections()` + `renderMainSections()` |
| 9 | `src/app/components/resume/templates/executive-pdf.tsx` | Use `renderSidebarSections()` + `renderMainSections()` |
| 10 | `src/app/components/resume/templates/photo-pdf.tsx` | Use `renderSidebarSections()` + `renderMainSections()` |
| 11 | `src/app/components/resume/resume-detail.tsx` | Hydration fix, autosave, visibility toggle, resizable panels, mobile toggle, section order wiring |

---

## DO NOT Do These Things

1. **DO NOT** install `@radix-ui/react-resizable-panels` — the base `react-resizable-panels` package is standalone
2. **DO NOT** run `npx shadcn add resizable` — it may conflict with your Base UI setup
3. **DO NOT** edit files in `drizzle/` — no DB migration needed (sectionOrder lives inside the JSON `data` column)
4. **DO NOT** remove the `saveChanges` function — keep it for the "Save as New" clone path and any manual triggers
5. **DO NOT** change the API route — `ResumeDataSchema` uses `.passthrough()` which already allows new fields once added to the Zod schema
6. **DO NOT** touch the export PDF route (`/api/export/pdf`) — it reads from DB which will have the new fields
7. **DO NOT** add Zustand or TanStack Query — the existing Context store works fine for this scope
