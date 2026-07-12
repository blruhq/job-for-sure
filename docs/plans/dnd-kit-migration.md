# DnD Kit Migration Plan — Resume Editor + Kanban Board

> **For coding agent:** Follow every step exactly. Do NOT skip steps. Do NOT rename variables. Copy-paste the code blocks provided. Read the ENTIRE file before editing it.

## Installed Packages

```
@dnd-kit/core@6.3.1  @dnd-kit/sortable@10.0.0  @dnd-kit/utilities@3.2.2
```

These are ALREADY installed. Do NOT reinstall.

---

## Part 1: Resume Editor — `EditableList` Sortable

### File: `app/components/resume/resume-detail.tsx`

### What to change

The `EditableList` component (lines ~98-166) currently uses `ChevronUp`/`ChevronDown` buttons for reordering. Replace the internal rendering with `@dnd-kit/sortable` while keeping the exact same external API (props, `renderItem`, `onChange`, etc).

### Step 1.1: Add imports (TOP of file, after existing imports ~line 13)

Add these imports after the existing `lucide-react` import line:

```typescript
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
```

### Step 1.2: Create `SortableItem` wrapper component

Add this NEW component BEFORE the `EditableList` function definition (around line ~97, right after `TagInput` component ends):

```typescript
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
      className="relative rounded-xs border border-border bg-background p-3"
    >
      {children}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
    </div>
  )
}
```

### Step 1.3: Rewrite `EditableList` component

Replace the ENTIRE `EditableList` function (currently lines ~98-166) with this NEW version:

```typescript
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // Generate stable IDs for sortable items
  // Items may not have an `id` field, so we use index-based keys
  const itemIds = items.map((_, i) => `item-${label}-${i}`)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
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
    <div className="border-t border-border/50 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono text-[10px]">{label}</span>
        <button
          type="button"
          onClick={addItem}
          className="flex cursor-pointer items-center gap-0.5 rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <Plus size={10} /> Add
        </button>
      </div>
      {items.length === 0 && (
        <p className="py-2 text-center text-[10px] text-muted-foreground/50 italic">No entries yet. Click "Add" to create one.</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <SortableItem key={itemIds[i]} id={itemIds[i]}>
                {/* Add left padding for the drag handle */}
                <div className="pl-5">
                  <div className="absolute right-2 top-2">
                    <button type="button" onClick={() => removeItem(i)} className="cursor-pointer rounded-xs p-0.5 text-muted-foreground hover:text-red-500">
                      <X size={12} />
                    </button>
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
      </DndContext>
    </div>
  )
}
```

### Step 1.4: Clean up unused imports

After the rewrite, `ChevronUp` and `ChevronDown` are no longer used. Remove them from the lucide-react import line (line 5). The import should change from:

```typescript
import { ArrowLeft, Wand2, Download, Trash2, Plus, X, ChevronUp, ChevronDown, PlusCircle, Lightbulb } from 'lucide-react'
```

to:

```typescript
import { ArrowLeft, Wand2, Download, Trash2, Plus, X, PlusCircle, Lightbulb, GripVertical } from 'lucide-react'
```

(Note: `GripVertical` is used inside the `SortableItem` component. Since we import it separately in Step 1.1 for the @dnd-kit block, REMOVE the separate GripVertical import from Step 1.1 and add it here instead. Do NOT import GripVertical twice.)

**CORRECTION:** Do NOT add GripVertical to the Step 1.1 block. Instead, add it ONLY to the existing lucide-react import on line 5. Remove GripVertical from the @dnd-kit import block in Step 1.1.

### Step 1.5: Verify

- No TypeScript errors
- The `EditableList` is used in 6 places: Experience, Education, Projects, Certifications, Languages, Custom Sections — all should get drag-and-drop automatically
- The `moveItem` function that used ChevronUp/ChevronDown is fully removed
- The `GripVertical` icon shows on the LEFT side of each item
- The X (remove) button stays on the RIGHT side

---

## Part 2: Kanban Board — `ApplicationsView` DnD Upgrade

### File: `app/components/pipeline/applications-view.tsx`

### What to change

Replace the native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) with `@dnd-kit/core`. The kanban needs cross-column dragging (different from the editor which is single-list sortable).

### Step 2.1: Replace imports (TOP of file)

Replace lines 1-10 (the `'use client'` + import block) with:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from '~/i18n/routing'
import { Trash2, Link2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { useTranslations } from 'next-intl'
import type { ApplicationBoard, ApplicationColumnId, PipelineJob } from '~/types/resume'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core'
```

**Note:** Removed `Plus`, `MessageSquare`, `KanbanSquare` from lucide-react (unused). Kept `Trash2`, `Link2`.

### Step 2.2: Add DraggableJobCard and DroppableColumn helper components

Add these BEFORE the `ApplicationsView` function (before line ~19):

```typescript
// ── Draggable job card wrapper ──
function DraggableJobCard({ job, children }: { job: PipelineJob; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.key,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab rounded-sm border border-border/60 bg-card p-2.5 transition-all active:cursor-grabbing hover:border-primary/50',
      )}
    >
      {children}
    </div>
  )
}

// ── Droppable column wrapper ──
function DroppableColumn({ colId, isOver, children }: { colId: ApplicationColumnId; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: colId })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-sm border border-border transition-colors',
        isOver && 'border-primary bg-accent-soft/30',
      )}
    >
      {children}
    </div>
  )
}
```

### Step 2.3: Rewrite ApplicationsView component

Replace the ENTIRE `ApplicationsView` function (lines ~19-193) with:

```typescript
export function ApplicationsView() {
  const router = useRouter()
  const t = useTranslations('applications')
  const { applications, moveJob, removeJob, clearApplications } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [dragOverCol, setDragOverCol] = useState<ApplicationColumnId | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  // ── All jobs for filter ──
  const allJobs = [...applications.bookmark, ...applications.applied, ...applications.interviewing, ...applications.offers]
  const resumeNames = ['all', ...new Set(allJobs.map((j) => j.resume).filter(Boolean))]

  const filterJobs = (jobs: PipelineJob[]) => filter === 'all' ? jobs : jobs.filter((j) => j.resume === filter)

  // ── Stats ──
  const total = allJobs.length
  const avgScore = total > 0 ? Math.round(allJobs.reduce((s, j) => s + j.score, 0) / total) : 0

  // ── Find which column a job belongs to ──
  const findJobColumn = (jobKey: string): ApplicationColumnId | null => {
    for (const colId of ['bookmark', 'applied', 'interviewing', 'offers'] as ApplicationColumnId[]) {
      if (applications[colId].some((j) => j.key === jobKey)) return colId
    }
    return null
  }

  // ── DnD handler ──
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDragOverCol(null)
    if (!over) return

    const jobKey = active.id as string
    const fromCol = findJobColumn(jobKey)
    // `over.id` could be a column ID (dropped on empty column area)
    // or another job's key (dropped on a job card inside a column)
    const overId = over.id as string
    const isColumnId = ['bookmark', 'applied', 'interviewing', 'offers'].includes(overId)

    let toCol: ApplicationColumnId | null = null
    if (isColumnId) {
      toCol = overId as ApplicationColumnId
    } else {
      // Dropped on a job — find that job's column
      toCol = findJobColumn(overId)
    }

    if (fromCol && toCol && fromCol !== toCol) {
      moveJob(jobKey, fromCol, toCol)
      notify({ message: `Moved to ${toCol}`, type: 'success' })
    }
  }

  const handleDragOver = (event: React.DragEvent | null, colId: ApplicationColumnId) => {
    setDragOverCol(colId)
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* ── Header ── */}
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

      {/* ── Kanban Board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          // Highlight column during drag
          const overId = e.over?.id as string | undefined
          if (overId) {
            const isColumnId = ['bookmark', 'applied', 'interviewing', 'offers'].includes(overId)
            if (isColumnId) {
              setDragOverCol(overId as ApplicationColumnId)
            } else {
              // Over a job — find its column
              const col = findJobColumn(overId)
              if (col) setDragOverCol(col)
            }
          }
        }}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {COLUMNS.map((col) => {
            const jobs = filterJobs(applications[col.id])
            const isOver = dragOverCol === col.id

            return (
              <DroppableColumn key={col.id} colId={col.id} isOver={isOver}>
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.dot }} />
                    <span className="text-xs font-semibold text-foreground">{t(col.labelKey)}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{jobs.length}</span>
                  </div>
                  <button
                    onClick={() => clearApplications()}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Clear"
                  >
                    ×
                  </button>
                </div>

                {/* Job Cards */}
                <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
                  {jobs.length === 0 && (
                    <div className="px-2 py-4 text-center">
                      <p className="text-[11px] text-muted-foreground">{t('noApplications')}</p>
                      <button
                        onClick={() => router.push('/chat')}
                        className="mt-2 text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {t('addJobs')}
                      </button>
                    </div>
                  )}

                  {jobs.map((job) => (
                    <DraggableJobCard key={job.key} job={job}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-foreground truncate">{job.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{job.company}</div>
                        </div>
                        {job.score > 0 && (
                          <span className={cn(
                            'shrink-0 rounded-xs px-1 py-px text-[9px] font-mono font-semibold',
                            job.score >= 85 ? 'bg-success/10 text-success' : job.score >= 70 ? 'bg-primary/10 text-primary' : 'bg-warn/10 text-warn'
                          )}>
                            {job.score}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground">
                        {job.loc && <span className="truncate">{job.loc}</span>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Link2 size={10} /> Open
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeJob(job.key, col.id)
                            notify({ message: 'Removed from board', type: 'info' })
                          }}
                          className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Trash2 size={10} /> Remove
                        </button>
                      </div>
                    </DraggableJobCard>
                  ))}
                </div>
              </DroppableColumn>
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}
```

### Step 2.4: Make sure `resumes` is NOT destructured from store (it was unused in original, still unused)

In the original code, `resumes` was destructured from `useAppStore()` but never used. The rewrite correctly omits it. Do NOT re-add it.

---

## Part 3: Verification Checklist

After making all changes, run these commands and verify:

```bash
# 1. TypeScript check — must pass with ZERO errors
npx tsc --noEmit

# 2. Unit tests — must all pass
pnpm vitest run

# 3. Dev server — start and manually verify
pnpm dev
```

### Manual verification:

1. **Resume Editor drag-and-drop:**
   - Go to `/en/chat` → click a resume → Editor tab
   - Add 2+ items to Work Experience
   - Drag the grip handle to reorder → items should swap smoothly
   - Verify same for Projects, Education, Certifications, Languages, Custom Sections
   - Verify the X (delete) button still works
   - Verify "Add" button still works
   - Click "Save Changes" → verify new order persists

2. **Kanban Board drag-and-drop:**
   - Go to the Application Tracker
   - Drag a job card from one column to another
   - Verify the job moves to the new column
   - Verify the column highlights on hover during drag
   - Verify the "Open" and "Remove" buttons still work (they should NOT trigger drag)
   - Verify the notification toast appears on successful move

---

## Key Gotchas (READ THESE)

1. **Do NOT change the `EditableList` props or external API.** The parent component (`ResumeDetail`) calls `EditableList` with `items`, `onChange`, `renderItem`, `createNew`, `label`. These must stay the same.

2. **The `renderItem` callback signature must NOT change:** `(item: T, index: number, update: (item: T) => void) => React.ReactNode`

3. **In the Kanban, `e.stopPropagation()` is CRITICAL on the Open and Remove buttons.** Without it, clicking them would start a drag. The `DraggableJobCard` spreads `{...listeners}` on the entire card, so clicks on buttons inside need to be stopped. But ALSO note: the `useDraggable` hook from @dnd-kit uses pointer events, not click events, so `stopPropagation` on `onClick` is enough.

4. **`PointerSensor` activation constraint `{ distance: 5 }`** means the user must drag at least 5px before it counts as a drag (not a click). This is important so clicking buttons inside cards doesn't accidentally start a drag.

5. **`TouchSensor` activation constraint `{ delay: 150, tolerance: 5 }`** means on mobile, the user must long-press for 150ms before dragging. This prevents drag from interfering with scrolling.

6. **The `GripVertical` icon import should come from `lucide-react`** (the existing icon library), NOT from @dnd-kit. Add it to the existing lucide-react import line in `resume-detail.tsx`.

7. **Do NOT touch `app/lib/store.tsx`.** The `moveJob` function signature `(jobKey, fromCol, toCol)` stays the same. The Kanban component is the only caller.

8. **`arrayMove` comes from `@dnd-kit/sortable`.** Do NOT write your own array move utility.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `app/components/resume/resume-detail.tsx` | Add @dnd-kit imports, add `SortableItem` component, rewrite `EditableList` with `DndContext` + `SortableContext`, remove ChevronUp/ChevronDown imports |
| `app/components/pipeline/applications-view.tsx` | Replace native HTML5 DnD with `@dnd-kit/core` `DndContext` + `useDraggable` + `useDroppable`, remove native drag state vars |

**No other files need changes.** `store.tsx`, `types/resume.ts`, `package.json` — all unchanged.
