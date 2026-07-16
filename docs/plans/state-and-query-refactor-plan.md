# Global State & Data Fetching Refactor Plan

> **For the implementing agent:** Follow every step in order. Do NOT skip any file or compile check. Do NOT use Context. Keep UI state in Zustand + Immer and Server state in TanStack Query.

---

## Table of Contents
1. [Step 1: Install Package Dependencies](#step-1-install-package-dependencies)
2. [Step 2: Database Schema & Relations Refactoring](#step-2-database-schema--relations-refactoring)
3. [Step 3: Centralized API Client Implementation](#step-3-centralized-api-client-implementation)
4. [Step 4: Query Provider Setup](#step-4-query-provider-setup)
5. [Step 5: Zustand Store & TanStack Query Hooks Setup](#step-5-zustand-store--tanstack-query-hooks-setup)
6. [Step 6: Core Component Refactoring Slices](#step-6-core-component-refactoring-slices)
7. [Step 7: Clean Up Dead Code](#step-7-clean-up-dead-code)
8. [Step 8: Verify Build & Compile](#step-8-verify-build--compile)

---

## Step 1: Install Package Dependencies

Run this command in the workspace root:
```bash
pnpm add zustand @tanstack/react-query immer
```
Verify that `zustand`, `@tanstack/react-query`, and `immer` are in `package.json`.

---

## Step 2: Database Schema & Relations Refactoring

### 2A: Update `src/app/lib/schema.ts`
We are deleting the dead `tailoredResumes` table, removing the `tailoredResumeId` from applications, and adding the missing Drizzle relation for `coverLetter`.

Replace sections in `src/app/lib/schema.ts` matching these steps:

1. **Delete** the `tailoredResumes` table and its relation definition completely (lines 131 to 149):
   - Remove `tailoredResumes` definition.
   - Remove `tailoredResumesRelations` definition.

2. **Update** `applications` table (line 154) to remove `tailoredResumeId`:
   - Delete line 172: `tailoredResumeId: text("tailored_resume_id").references(() => tailoredResumes.id, { onDelete: "set null" }),`

3. **Update** `applicationsRelations` (line 184) to remove `tailoredResume` and add the missing `coverLetter` relation:
   Replace lines 184 to 189:
   ```typescript
   export const applicationsRelations = relations(applications, ({ one }) => ({
     user: one(user, { fields: [applications.userId], references: [user.id] }),
     resume: one(resumes, { fields: [applications.resumeId], references: [resumes.id] }),
     coverLetter: one(coverLetters, { fields: [applications.coverLetterId], references: [coverLetters.id] }),
   }));
   ```

### 2B: Generate and Apply DB Migration
Run these commands in order:
```bash
pnpm db:generate
pnpm db:migrate
```

Verify that the migrations directory has a new sql file dropping the table and changing the foreign keys.

---

## Step 3: Centralized API Client Implementation

Create a new file: `src/app/lib/api-client.ts`

```typescript
import type { Resume, PipelineJob, ApplicationBoard, PendingTailor } from '~/types/resume'

export interface CreateApplicationPayload {
  sourceKey: string
  company: string
  jobTitle: string
  jobUrl?: string
  location?: string
  logoUrl?: string
  color?: string
  level?: string
  matchScore?: number
  resumeId?: string
  status: string
}

export interface ReorderApplicationsPayload {
  updates: Array<{
    id: string
    status: string
    position: number
  }>
}

export interface GenerateCoverLetterPayload {
  resume: Resume
  jdText?: string
  company?: string
  role?: string
  focus?: string
  language: 'en' | 'th'
}

export class ApiClient {
  private static async request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${res.status}`)
    }
    return res.json()
  }

  // Resumes
  static getResumes(): Promise<Array<{ id: string; data: Resume; isBase: boolean }>> {
    return this.request('/api/resumes')
  }

  static createResume(payload: { id: string; data: Resume; isBase?: boolean }): Promise<void> {
    return this.request('/api/resumes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  static updateResume(id: string, payload: { data: Partial<Resume>; isBase?: boolean }): Promise<void> {
    return this.request(`/api/resumes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  static deleteResume(id: string): Promise<void> {
    return this.request(`/api/resumes/${id}`, {
      method: 'DELETE',
    })
  }

  // Applications
  static getApplications(): Promise<any[]> {
    return this.request('/api/applications')
  }

  static createApplication(payload: CreateApplicationPayload): Promise<{ id: string }> {
    return this.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  static deleteApplication(id: string): Promise<void> {
    return this.request(`/api/applications/${id}`, {
      method: 'DELETE',
    })
  }

  static clearApplications(): Promise<void> {
    return this.request('/api/applications', {
      method: 'DELETE',
    })
  }

  static reorderApplications(payload: ReorderApplicationsPayload): Promise<void> {
    return this.request('/api/applications/reorder', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  // Cover Letters
  static getCoverLetters(): Promise<any[]> {
    return this.request('/api/cover-letters')
  }

  static deleteCoverLetter(id: string): Promise<void> {
    return this.request(`/api/cover-letters/${id}`, {
      method: 'DELETE',
    })
  }

  static generateCoverLetter(payload: GenerateCoverLetterPayload): Promise<{ id: string; letter: string }> {
    return this.request('/api/ai/cover-letter', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  // Parser
  static parseResume(file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    return this.request('/api/parse-resume', {
      method: 'POST',
      body: formData,
      // Let browser set boundaries for multipart/form-data
    })
  }

  // Admin
  static getSourceHealth(): Promise<any> {
    return this.request('/api/jobs/source-health')
  }
}
```

---

## Step 4: Query Provider Setup

Create a new file: `src/app/components/layout/query-provider.tsx`
This wraps children in TanStack Query's QueryClientProvider.

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute stale time
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Then, wrap the app layout `src/app/[locale]/layout.tsx` in this provider. Add it after i18n NextIntlClientProvider.

---

## Step 5: Zustand Store & TanStack Query Hooks Setup

We will replace the Context-based `src/app/lib/store.tsx` entirely with a Zustand UI store and TanStack Query hooks.

Replace the contents of `src/app/lib/store.tsx`:

```tsx
'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Resume, PipelineJob, ApplicationBoard, PendingTailor } from '~/types/resume'
import { ApiClient } from '~/lib/api-client'
import { notify } from '~/lib/toast'
import { EMPTY_APPLICATIONS } from '~/lib/constants'

// ── Ephemeral UI Zustand Store ──

interface AppUIState {
  sidebarCollapsed: boolean
  activeResumeId: string | null
  targetCompanyKey: string
  pendingTailor: PendingTailor | null
  
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveResumeId: (id: string | null) => void
  setTargetCompanyKey: (key: string) => void
  setPendingTailor: (pending: PendingTailor | null) => void
  toggleAcceptedChange: (changeId: string) => void
}

export const useUIStore = create<AppUIState>()(
  immer((set) => ({
    sidebarCollapsed: false,
    activeResumeId: null,
    targetCompanyKey: 'none',
    pendingTailor: null,

    toggleSidebar: () =>
      set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed
      }),
    setSidebarCollapsed: (collapsed) =>
      set((state) => {
        state.sidebarCollapsed = collapsed
      }),
    setActiveResumeId: (id) =>
      set((state) => {
        state.activeResumeId = id
      }),
    setTargetCompanyKey: (key) =>
      set((state) => {
        state.targetCompanyKey = key
      }),
    setPendingTailor: (pending) =>
      set((state) => {
        state.pendingTailor = pending
      }),
    toggleAcceptedChange: (changeId) =>
      set((state) => {
        if (!state.pendingTailor) return
        const accepted = new Set(state.pendingTailor.accepted)
        if (accepted.has(changeId)) {
          accepted.delete(changeId)
        } else {
          accepted.add(changeId)
        }
        state.pendingTailor.accepted = accepted
      }),
  }))
)

// Legacy alias wrapper hook to prevent breaking imports of useAppStore in UI layout components
export function useAppStore() {
  const uiState = useUIStore()
  const { data: resumes } = useResumes()
  const { data: applications } = useApplications()
  return {
    ...uiState,
    resumes: resumes || [],
    applications: applications || EMPTY_APPLICATIONS,
    hydrated: true, // Legacy compatibility
    loading: false,  // Legacy compatibility
  }
}

// ── Server State TanStack Query Hooks ──

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const data = await ApiClient.getResumes()
      return data.map((r) => ({ ...r.data, id: r.id } as Resume))
    },
  })
}

// Helper query to find a single resume
export function useResume(id: string | null) {
  const { data: resumes } = useResumes()
  return resumes?.find((r) => r.id === id)
}

// Helper to group application database rows into Kanban column buckets
function groupByStatus(apps: any[]): ApplicationBoard {
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

  const timeLabels: Record<string, string> = {
    bookmarked: 'saved',
    applied: 'just now',
    interviewing: 'scheduled',
    offered: 'received',
    rejected: 'rejected',
  }

  for (const app of sorted) {
    const job: PipelineJob = {
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

    let col: keyof ApplicationBoard = 'bookmark'
    if (app.status === 'bookmarked') col = 'bookmark'
    else if (app.status === 'offered') col = 'offers'
    else if (['applied', 'interviewing', 'rejected'].includes(app.status)) {
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

// Resumes Mutations
export function useCreateResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.createResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useUpdateResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Resume>; isBase?: boolean }) =>
      ApiClient.updateResume(id, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

export function useDeleteResume() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
  })
}

// Applications Mutations
export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useClearApplications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.clearApplications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useReorderApplications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ApiClient.reorderApplications,
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<ApplicationBoard>(['applications'])

      // Perform optimistic update on the cache
      // The implementation details will map Kanban movement states
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['applications'], context.previous)
      }
      notify({ message: 'Failed to move application.', type: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
```

---

## Step 6: Core Component Refactoring Slices

We must refactor all components that read database state from `useAppStore()` or context:

### 6A: Refactoring `src/app/components/layout/sidebar.tsx`
Instead of reading resumes from store Context, it reads from `useResumes()` query:

```tsx
import { useResumes, useUIStore } from '~/lib/store'

export function Sidebar() {
  const { data: resumes, isLoading } = useResumes()
  const activeResumeId = useUIStore((s) => s.activeResumeId)
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  ...
}
```

### 6B: Refactoring `src/app/components/resume/resume-detail.tsx`
Replace the local store bindings with query hooks:

```tsx
import { useUIStore, useResumes, useUpdateResume, useDeleteResume } from '~/lib/store'

export function ResumeDetail({ resumeId }: { resumeId: string }) {
  const { data: resumes } = useResumes()
  const resume = resumes?.find((r) => r.id === resumeId)
  
  const updateMutation = useUpdateResume()
  const deleteMutation = useDeleteResume()

  // Replace updateResume(id, data) with updateMutation.mutate({ id, data })
  // Replace deleteResume(id) with deleteMutation.mutateAsync(id)
}
```

### 6C: Refactoring Kanban Application board (`src/app/components/pipeline/applications-view.tsx`)
```tsx
import { useApplications, useReorderApplications, useDeleteApplication, useClearApplications } from '~/lib/store'

export function ApplicationsView() {
  const { data: board, isLoading } = useApplications()
  const reorderMutation = useReorderApplications()
  const deleteMutation = useDeleteApplication()
  const clearMutation = useClearApplications()

  // Replace moveJob, removeJob, clearApplications with corresponding mutation calls
}
```

---

## Step 7: Clean Up Dead Code

Delete the `/api/resumes` checks for `tailored_resumes` inside the dashboard/admin counts if found:
In `/src/app/[locale]/admin/page.tsx` (or dashboard file):
Change:
```typescript
const [tailoredCount] = await db.select({ total: count() }).from(tailoredResumes)
```
to:
```typescript
const [tailoredCount] = await db.select({ total: count() }).from(resumes).where(eq(resumes.isBase, false))
```

---

## Step 8: Verify Build & Compile

Run compilation check:
```bash
npx tsc --noEmit
```
Verify that Next.js static files build:
```bash
pnpm build
```
Run tests:
```bash
pnpm test
```
Commit files using conventional commits prefix:
```bash
git add .
git commit -m "refactor(store): migrate React Context to Zustand and TanStack Query"
git push
```

---

## Step 9: Optional Phase — PDF.js Canvas Rendering (For Ultra-Performance)

> **Recommended future UX upgrade:** Standard `@react-pdf/renderer` `<PDFViewer>` uses an iframe, which renders the browser's native PDF interface (print/download bars, gray background, inconsistent styling across Chrome/Safari/mobile).
> 
> To match **Reactive Resume** and **FlowCV's** premium look, implement a canvas-based viewer:
> 
> 1. Install `pdfjs-dist`:
>    ```bash
>    pnpm add pdfjs-dist
>    ```
> 
> 2. Create a client-side PDF canvas renderer `src/app/components/resume/resume-canvas-preview.tsx` that:
>    - Uses `@react-pdf/renderer`'s `pdf(<ResumePDF resume={resume} />).toBlob()` helper to compile the document into a blob in memory.
>    - Loads the blob via `pdfjsLib.getDocument({ data: arrayBuffer })`.
>    - Instantiates an HTML5 `<canvas>` in React for each page of the document.
>    - Renders the pages directly to the canvases inside the React cycle.
> 
> This eliminates iframe scrollbars, allows dark-mode styling of the page borders, and speeds up typing responsiveness.
