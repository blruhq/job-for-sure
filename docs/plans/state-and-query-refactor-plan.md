# Fresh State & Data Fetching Refactor Plan (Zero-Legacy Edition)

> **For the implementing agent:** Follow every step in order. Do NOT keep any backward-compatibility hooks, aliased wrappers, or dummy providers. Build the cleanest, modular state architecture possible.

---

## Directory Map

```
src/app/
├── lib/
│   ├── schema.ts         Drizzle DB schema (Clean slate, tailored_resumes removed)
│   └── api-client.ts     NEW: Typed fetch client wrapping all internal routes
├── hooks/
│   ├── use-ui.ts         NEW: Zustand client store for layout & UI state
│   ├── use-resumes.ts    NEW: TanStack Query hooks for Resumes querying
│   └── use-apps.ts       NEW: TanStack Query hooks for Kanban/Applications
└── components/
    └── layout/
        └── query-provider.tsx   NEW: TanStack Query Client wrapper
```

---

## Step 1: Install Dependencies

Run in root:
```bash
pnpm add zustand @tanstack/react-query immer
```

---

## Step 2: Drizzle Schema Cleanup

### 2A: Update `src/app/lib/schema.ts`
1. **Delete** the `tailoredResumes` table definition completely (lines 131 to 149).
2. **Delete** the `tailoredResumesRelations` definition.
3. **Delete** the `tailoredResumeId` column inside `applications` (line 172).
4. **Update** `applicationsRelations` (line 184) to reference only `user`, `resume`, and `coverLetter`:
   ```typescript
   export const applicationsRelations = relations(applications, ({ one }) => ({
     user: one(user, { fields: [applications.userId], references: [user.id] }),
     resume: one(resumes, { fields: [applications.resumeId], references: [resumes.id] }),
     coverLetter: one(coverLetters, { fields: [applications.coverLetterId], references: [coverLetters.id] }),
   }));
   ```

### 2B: Apply Database Changes
Since we are in a fresh-start state, drop the database schema and push the new Drizzle schema cleanly:
```bash
pnpm db:generate
pnpm db:migrate
```

---

## Step 3: Centralized API Client

Create `src/app/lib/api-client.ts`:

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
    return this.request('/api/resumes', { method: 'POST', body: JSON.stringify(payload) })
  }

  static updateResume(id: string, payload: { data: Partial<Resume>; isBase?: boolean }): Promise<void> {
    return this.request(`/api/resumes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  static deleteResume(id: string): Promise<void> {
    return this.request(`/api/resumes/${id}`, { method: 'DELETE' })
  }

  // Applications
  static getApplications(): Promise<any[]> {
    return this.request('/api/applications')
  }

  static createApplication(payload: CreateApplicationPayload): Promise<{ id: string }> {
    return this.request('/api/applications', { method: 'POST', body: JSON.stringify(payload) })
  }

  static deleteApplication(id: string): Promise<void> {
    return this.request(`/api/applications/${id}`, { method: 'DELETE' })
  }

  static clearApplications(): Promise<void> {
    return this.request('/api/applications', { method: 'DELETE' })
  }

  static reorderApplications(payload: ReorderApplicationsPayload): Promise<void> {
    return this.request('/api/applications/reorder', { method: 'POST', body: JSON.stringify(payload) })
  }

  // Cover Letters
  static getCoverLetters(): Promise<any[]> {
    return this.request('/api/cover-letters')
  }

  static deleteCoverLetter(id: string): Promise<void> {
    return this.request(`/api/cover-letters/${id}`, { method: 'DELETE' })
  }

  static generateCoverLetter(payload: GenerateCoverLetterPayload): Promise<{ id: string; letter: string }> {
    return this.request('/api/ai/cover-letter', { method: 'POST', body: JSON.stringify(payload) })
  }

  // Parser
  static parseResume(file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    return this.request('/api/parse-resume', {
      method: 'POST',
      body: formData,
    })
  }

  // Admin
  static getSourceHealth(): Promise<any> {
    return this.request('/api/jobs/source-health')
  }
}
```

---

## Step 4: UI state store (Zustand)

Create `src/app/hooks/use-ui.ts`:

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { PendingTailor } from '~/types/resume'

interface UIState {
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

export const useUIStore = create<UIState>()(
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
```

---

## Step 5: Query Provider Setup

Create `src/app/components/layout/query-provider.tsx`:

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
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Wrap `src/app/[locale]/layout.tsx`:
```typescript
import { QueryProvider } from '~/components/layout/query-provider'
```
Wrap the `ThemeProvider` inside `<QueryProvider>` in the `LocaleLayout` return block.

---

## Step 6: TanStack Query Hooks

### 6A: Resumes Hooks (`src/app/hooks/use-resumes.ts`)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from '~/lib/api-client'
import type { Resume } from '~/types/resume'

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const data = await ApiClient.getResumes()
      return data.map((r) => ({ ...r.data, id: r.id } as Resume))
    },
  })
}

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
```

### 6B: Applications Hooks (`src/app/hooks/use-apps.ts`)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClient } from '~/lib/api-client'
import type { PipelineJob, ApplicationBoard } from '~/types/resume'
import { notify } from '~/lib/toast'

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}

export function useMoveApplication() {
  const queryClient = useQueryClient()
  const reorderMutation = useReorderApplications()

  return useMutation({
    mutationFn: async ({
      jobKey,
      fromCol,
      toCol,
      toIndex,
    }: {
      jobKey: string
      fromCol: keyof ApplicationBoard
      toCol: keyof ApplicationBoard
      toIndex?: number
    }) => {
      const previous = queryClient.getQueryData<ApplicationBoard>(['applications'])
      if (!previous) return

      const from = [...previous[fromCol]]
      const to = fromCol === toCol ? from : [...previous[toCol]]

      const idx = from.findIndex((j) => j.key === jobKey)
      if (idx === -1) return

      const [job] = from.splice(idx, 1)

      const statusLabels: Record<string, string> = {
        bookmark: 'bookmarked',
        applied: 'applied',
        interviewing: 'interviewing',
        offers: 'offered',
        rejected: 'rejected',
      }
      const targetStatus = statusLabels[toCol]

      const target = typeof toIndex === 'number' ? toIndex : 0
      to.splice(target, 0, job)

      const updates: Array<{ id: string; status: string; position: number }> = []
      to.forEach((j, i) => {
        if (j.applicationId) {
          updates.push({ id: j.applicationId, status: targetStatus, position: i })
        }
      })
      if (fromCol !== toCol) {
        const sourceStatus = statusLabels[fromCol]
        from.forEach((j, i) => {
          if (j.applicationId) {
            updates.push({ id: j.applicationId, status: sourceStatus, position: i })
          }
        })
      }

      await reorderMutation.mutateAsync({ updates })
    },
    onMutate: async ({ jobKey, fromCol, toCol, toIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<ApplicationBoard>(['applications'])

      if (previous) {
        const next = JSON.parse(JSON.stringify(previous)) as ApplicationBoard
        const from = next[fromCol]
        const to = next[toCol]

        const idx = from.findIndex((j) => j.key === jobKey)
        if (idx !== -1) {
          const [job] = from.splice(idx, 1)
          const target = typeof toIndex === 'number' ? toIndex : 0
          to.splice(target, 0, job)
          queryClient.setQueryData(['applications'], next)
        }
      }

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['applications'], context.previous)
      }
      notify({ message: 'Failed to move job.', type: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
  })
}
```

---

## Step 7: Clean Up Global Layout (`src/app/[locale]/(app)/layout.tsx`)

Delete `<AppStoreProvider>` wrapping from the layout entirely.
1. Remove line 5: `import { AppStoreProvider, useAppStore } from '~/lib/store'`
2. Add imports:
   ```typescript
   import { useUIStore } from '~/hooks/use-ui'
   ```
3. Update `AppShell` to read from the Zustand store directly:
   ```typescript
   const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
   const toggleSidebar = useUIStore((s) => s.toggleSidebar)
   ```
4. Replace the default export return block (lines 104 to 112) with a direct wrap:
   ```tsx
   export default function AppLayout({ children }: { children: React.ReactNode }) {
     return (
       <AuthGuard>
         <AppShell>{children}</AppShell>
       </AuthGuard>
     )
   }
   ```

---

## Step 8: Delete `src/app/lib/store.tsx`
Delete the file `/Users/pantorn/satori/projects/job-for-sure/src/app/lib/store.tsx` entirely once all imports are refactored.

---

## Step 9: Component-Level Refactoring

Refactor the components that read data from the store to use the new hooks:

### 9A: `src/app/components/layout/sidebar.tsx`
- Replace `useAppStore()` imports with `useResumes()` and `useUIStore()`.
- Access resumes via `const { data: resumes } = useResumes()`.
- Access active resume ID via `const activeResumeId = useUIStore((s) => s.activeResumeId)`.

### 9B: `src/app/components/resume/resume-detail.tsx`
- Replace `useAppStore()` with `useResumes()`, `useUIStore()`, and mutations `useUpdateResume()`, `useDeleteResume()`.
- Retrieve target resume from query:
  ```typescript
  const { data: resumes } = useResumes()
  const resume = resumes?.find((r) => r.id === resumeId)
  ```

### 9C: Kanban applications (`src/app/components/pipeline/applications-view.tsx`)
- Replace `useAppStore()` with `useApplications()`, `useReorderApplications()`, `useDeleteApplication()`, `useClearApplications()`.
- Connect mutations for reordering and clearing.

### 9D: Cover letters (`src/app/[locale]/(app)/cover-letter/page.tsx`)
- Point to custom query / API client methods instead of manual `fetch` calls.

### 9E: Admin dashboard (`src/app/[locale]/(app)/admin/page.tsx`)
- **Import** `eq` from `drizzle-orm` on line 7:
  ```typescript
  import { count, desc, sql, eq } from 'drizzle-orm'
  ```
- **Delete** the import of `tailoredResumes` from `~/lib/schema` on line 2.
- **Change** `resumeCount` (line 21) to count only base resumes:
  ```typescript
  const [resumeCount] = await db.select({ total: count() }).from(resumes).where(eq(resumes.isBase, true))
  ```
- **Change** `tailoredCount` (line 22) to count tailored resumes from the resumes table:
  ```typescript
  const [tailoredCount] = await db.select({ total: count() }).from(resumes).where(eq(resumes.isBase, false))
  ```

### 9F: Upload modal (`src/app/components/layout/upload-modal.tsx`)
- **Replace** `useAppStore()` imports with `useUIStore()` and the custom mutation `useCreateResume()`.
- **Use** `mutateAsync` instead of synchronous `addResume(resume)`:
  ```typescript
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const createResumeMutation = useCreateResume()

  // During save:
  await createResumeMutation.mutateAsync({
    id: resume.id,
    data: resume,
    isBase: true,
  })
  setActiveResumeId(resume.id)
  ```

### 9G: Chat dashboard (`src/app/components/chat/chat-view.tsx`)
- **Replace** `useAppStore()` with `useUIStore()`, `useResumes()`, `useApplications()`, and `useCreateResume()`.
- **Retrieve** resumes and applications from queries:
  ```typescript
  const { data: resumesList } = useResumes()
  const resumes = resumesList || []
  const activeResumeId = useUIStore((s) => s.activeResumeId)
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const activeResume = resumes.find((r) => r.id === activeResumeId) ?? null

  const { data: applicationsBoard } = useApplications()
  const applications = applicationsBoard || { bookmark: [], applied: [], interviewing: [], offers: [], rejected: [] }
  ```
- **Replace** synchronous `addResume` calls with `createResumeMutation.mutateAsync()`.

### 9H: ATS Keyword matcher (`src/app/components/ats/ats-view.tsx`)
- **Replace** store bindings with `useUIStore()`, `useResumes()`, and `useUpdateResume()`.
- **Resolve Re-Analysis Race Condition**: Since `mutateAsync` is asynchronous, calling `fetchAnalysis(jdText)` immediately after will read the *stale* local resume state before the cache updates, causing the score not to update until refresh.
  To fix, modify `fetchAnalysis` signature to accept an optional `resumeOverride` parameter:
  ```typescript
  const fetchAnalysis = useCallback(async (jd: string, resumeOverride?: Resume) => {
    const targetResume = resumeOverride || resume
    if (!targetResume) return
    // ... fetch logic ...
  }, [resume])
  ```
  Then refactor keyword click/injection to pass the updated clone directly:
  ```typescript
  const updatedResume = { ...resume, skills: nextSkills }
  await updateResumeMutation.mutateAsync({
    id: resume.id,
    data: { skills: nextSkills },
  })
  fetchAnalysis(jdText, updatedResume)
  ```

### 9I: Mock Interview Dashboard (`src/app/components/interview/interview-view.tsx`)
- **Replace** `useAppStore()` with `useResumes()` and `useUIStore()`.
- **Retrieve** resumes and active resume ID:
  ```typescript
  const { data: resumesList } = useResumes()
  const resumes = resumesList || []
  const activeResumeId = useUIStore((s) => s.activeResumeId)
  ```

### 9J: Mock Interview Setup (`src/app/components/interview/interview-setup.tsx`)
- **Replace** `useAppStore()` with `useResumes()`, `useUIStore()`, and `useApplications()`.
- **Retrieve** resumes, active resume ID, and applications board:
  ```typescript
  const { data: resumesList } = useResumes()
  const resumes = resumesList || []
  const activeResumeId = useUIStore((s) => s.activeResumeId)
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const { data: applicationsBoard } = useApplications()
  const applications = applicationsBoard || { bookmark: [], applied: [], interviewing: [], offers: [], rejected: [] }
  ```

### 9K: Job Search Panel (`src/app/components/resume/job-search-panel.tsx`)
- **Replace** `useAppStore()` with `useUIStore()`, `useApplications()`, mutations `useCreateApplication()`, `useDeleteApplication()`, and `useCreateResume()`.
- **Retrieve** applications board:
  ```typescript
  const { data: applicationsBoard } = useApplications()
  const applications = applicationsBoard || { bookmark: [], applied: [], interviewing: [], offers: [], rejected: [] }
  ```
- **Replace** `isBookmarked(key)` helper inline:
  ```typescript
  const isBookmarked = (key: string) => applications.bookmark.some((j) => j.key === key)
  ```
- **Connect** mutations for bookmarking (`useCreateApplication()`), removing bookmark (`useDeleteApplication()`), and adding resumes (`useCreateResume()`).

### 9L: Chat Upload Card (`src/app/components/chat/upload-card-message.tsx`)
- **Replace** `useAppStore()` with `useResumes()` and `useUpdateResume()`.
- **Retrieve** resumes list from query and update mutation:
  ```typescript
  const { data: resumesList } = useResumes()
  const resumes = resumesList || []
  const updateResumeMutation = useUpdateResume()
  ```

### 9M: Navigation Topbar (`src/app/components/layout/navbar.tsx`)
- **Replace** `useAppStore()` with `useUIStore()`.
- **Retrieve** sidebar collapsed state and toggle method:
  ```typescript
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  ```

### 9N: Main Dashboard (`src/app/components/dashboard/dashboard-view.tsx`)
- **Replace** `useAppStore()` with `useResumes()` and `useApplications()`.
- **Retrieve** resumes and applications from queries, replacing `loading` / `hydrated` with TanStack Query's loading states:
  ```typescript
  const { data: resumesList, isLoading: resumesLoading, isSuccess: resumesHydrated } = useResumes()
  const resumes = resumesList || []
  
  const { data: applicationsBoard, isLoading: appsLoading, isSuccess: appsHydrated } = useApplications()
  const applications = applicationsBoard || { bookmark: [], applied: [], interviewing: [], offers: [], rejected: [] }

  const loading = resumesLoading || appsLoading
  const hydrated = resumesHydrated && appsHydrated
  ```

### 9O: Inline Job Preview (`src/app/components/chat/job-preview.tsx`)
- **Replace** `useAppStore()` with `useApplications()`, mutations `useCreateApplication()`, and `useDeleteApplication()`.
- **Retrieve** applications and set up mutations:
  ```typescript
  const { data: applicationsBoard } = useApplications()
  const applications = applicationsBoard || { bookmark: [], applied: [], interviewing: [], offers: [], rejected: [] }
  const createApplicationMutation = useCreateApplication()
  const deleteApplicationMutation = useDeleteApplication()

  const isBookmarked = (key: string) => applications.bookmark.some((j) => j.key === key)
  ```
- **Replace** `bookmarkJob(job)` and `toggleBookmark(key)` with these mutation calls.

### 9P: Tailoring Review Panel (`src/app/components/resume/tailor-review-panel.tsx`)
- **Replace** `useAppStore()` with `useUIStore()`.
- **Retrieve** pending tailoring workspace state:
  ```typescript
  const pendingTailor = useUIStore((s) => s.pendingTailor)
  const toggleAcceptedChange = useUIStore((s) => s.toggleAcceptedChange)
  ```

### 9Q: Resume Co-Pilot (`src/app/components/resume/resume-copilot.tsx`)
- **Replace** `useAppStore()` with `useApplications()`.
- **Retrieve** applications board:
  ```typescript
  const { data: applicationsBoard } = useApplications()
  const applications = applicationsBoard || { bookmark: [], applied: [], interviewing: [], offers: [], rejected: [] }
  ```

---

## Step 10: Verify Build & Compile

Run validation checks:
```bash
npx tsc --noEmit
pnpm build
pnpm test
```
Stage only intended modifications and commit:
```bash
git add .
git commit -m "refactor(store): migrate global state and fetching to modular Zustand and TanStack Query"
git push
```
