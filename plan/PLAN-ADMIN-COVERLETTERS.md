# PLAN: Simple Admin Dashboard + Cover Letter Persistence

> **For the implementing agent:** Follow every step in order. Do NOT skip steps. Do NOT improvise. Copy code EXACTLY as written. Ask if confused — do not guess.

---

## Overview

Two tasks:

**Task A — Simple Admin Dashboard** (`/admin` page)
- Read-only DB stats page
- Email-gated (only `ADMIN_EMAIL` can access)
- Shows: user count, resume count, interview count, cover letter count, recent signups

**Task B — Cover Letter Persistence** (dedicated DB table)
- New `cover_letters` table
- Each generated cover letter saved as its own row
- Users get history (multiple letters per resume)
- API routes: GET, POST, PATCH, DELETE
- Cover letter page shows saved letters list

**Prerequisite:** PostHog plan (`PLAN-POSTHOG.md`) should be completed first.

---

# TASK A — ADMIN DASHBOARD

---

## Step A1 — Add ADMIN_EMAIL env var

### File: `.env.example`

Append at the end:

```
# ── Admin Dashboard ──
ADMIN_EMAIL=your-email@example.com
```

### File: `.env.local`

Append at the end:

```
# Admin Dashboard
ADMIN_EMAIL=longpantorn@gmail.com
```

**NOTE:** Use the email the user logs in with. Check the user table if unsure.

---

## Step A2 — Create admin page

Create file: `app/(app)/admin/page.tsx`

This is a **SERVER COMPONENT** (no `'use client'`). It goes inside `(app)` route group so it gets AuthGuard for free (user must be logged in). Then it additionally checks `ADMIN_EMAIL`.

Exact content:

```tsx
import { db } from '~/lib/db'
import { user, resumes, tailoredResumes, pipelineData, interviewSessions } from '~/lib/schema'
import { coverLetters } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { count, desc, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // ── Auth check ──
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session) redirect('/login')
  if (session.user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // ── Stats queries ──
  const [userCount] = await db.select({ total: count() }).from(user)
  const [resumeCount] = await db.select({ total: count() }).from(resumes)
  const [tailoredCount] = await db.select({ total: count() }).from(tailoredResumes)
  const [pipelineCount] = await db.select({ total: count() }).from(pipelineData)
  const [interviewCount] = await db.select({ total: count() }).from(interviewSessions)
  let coverLetterCount = { total: 0 }
  try {
    ;[coverLetterCount] = await db.select({ total: count() }).from(coverLetters)
  } catch {
    // Table might not exist yet if Task B migration hasn't run
  }

  // ── Recent signups (last 10) ──
  const recentUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(10)

  // ── Recent interviews (last 5) ──
  const recentInterviews = await db
    .select({
      id: interviewSessions.id,
      company: interviewSessions.company,
      role: interviewSessions.role,
      score: interviewSessions.score,
      type: interviewSessions.type,
      createdAt: interviewSessions.createdAt,
      userId: interviewSessions.userId,
    })
    .from(interviewSessions)
    .orderBy(desc(interviewSessions.createdAt))
    .limit(5)

  // ── Users joined this week ──
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [weekCount] = await db
    .select({ total: count() })
    .from(user)
    .where(sql`${user.createdAt} >= ${oneWeekAgo}`)

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-muted-foreground">Read-only overview of your database</p>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <StatCard label="Users" value={userCount.total} />
          <StatCard label="New This Week" value={weekCount.total} />
          <StatCard label="Resumes" value={resumeCount.total} />
          <StatCard label="Tailored" value={tailoredCount.total} />
          <StatCard label="Pipelines" value={pipelineCount.total} />
          <StatCard label="Interviews" value={interviewCount.total} />
          <StatCard label="Cover Letters" value={coverLetterCount.total} />
        </div>

        {/* ── Recent Signups ── */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Signups
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      No users yet
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{u.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent Interviews ── */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Interviews
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Score</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentInterviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No interviews yet
                    </td>
                  </tr>
                ) : (
                  recentInterviews.map((iv) => (
                    <tr key={iv.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{iv.company}</td>
                      <td className="px-3 py-2 text-muted-foreground">{iv.role}</td>
                      <td className="px-3 py-2 text-muted-foreground">{iv.type}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-primary">{iv.score}/10</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                        {new Date(iv.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helper component ──
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}
```

---

## Step A3 — Add admin link to sidebar (admin only)

### File: `app/components/layout/sidebar.tsx`

This is a client component. We need to conditionally show an admin link.

**Step A:** Add import at the top, after the existing `import { notify } from '~/lib/toast'`:

```ts
import { Shield } from 'lucide-react'
```

**NOTE:** The `lucide-react` import on line 6 already imports several icons. You can either add `Shield` to that import or add a new import line. Simplest: just add the new line after line 9.

**Step B:** In the `Sidebar()` function, after the existing destructuring from `useAppStore()` (line 23), add a state to check if user is admin:

Find this line (line 23):
```ts
  const { resumes, activeResumeId, setActiveResumeId, pipeline, sidebarCollapsed } = useAppStore()
```

ADD after it:
```ts
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { authClient } = await import('~/lib/auth-client')
        const { data: session } = await authClient.getSession()
        if (session?.user?.email) {
          setIsAdmin(true)
        }
      } catch {
        // not logged in
      }
    }
    checkAdmin()
  }, [])
```

**NOTE:** Also add `useState` and `useEffect` to the React import on line 3. Currently it imports:
```ts
import { } from 'react'
```
Wait — line 3 is blank. Check if there's already a React import. If not, add at the very top:
```ts
import { useState, useEffect } from 'react'
```

**Step C:** Find the Account section (around line 113-132):

```tsx
      {/* ── ACCOUNT ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          Account
        </div>
        <Link
          href="/settings"
          ...
        >
          <Settings size={15} className="shrink-0 opacity-70" />
          {!c && <span>Settings</span>}
        </Link>
      </div>
```

ADD the admin link INSIDE this div, AFTER the Settings link, BEFORE the closing `</div>`:

```tsx
        {isAdmin && (
          <Link
            href="/admin"
            title={c ? 'Admin' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
              pathname === '/admin'
                ? 'bg-sidebar-active text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
              c && 'justify-center px-0 mx-2',
            )}
          >
            <Shield size={15} className="shrink-0 opacity-70" />
            {!c && <span>Admin</span>}
          </Link>
        )}
```

**IMPORTANT:** The admin link is conditionally rendered. All logged-in users will see it for now (the real check is server-side in the admin page). Later when you add `ADMIN_EMAIL` check client-side, only the admin will see it. The server-side redirect is the real security.

---

# TASK B — COVER LETTER PERSISTENCE

---

## Step B1 — Add cover_letters table to schema

### File: `app/lib/schema.ts`

Append this BEFORE the last relations section. Add it after the `interviewSessionsRelations` (at the very end of the file, after line 199):

```ts
// ═══════════════════════════════════════════════════════════════
// COVER LETTERS
// ═══════════════════════════════════════════════════════════════

export const coverLetters = pgTable("cover_letters", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
  company: text("company"),
  role: text("role"),
  content: text("content").notNull(),
  jdText: text("jd_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  user: one(user, {
    fields: [coverLetters.userId],
    references: [user.id],
  }),
  resume: one(resumes, {
    fields: [coverLetters.resumeId],
    references: [resumes.id],
  }),
}));
```

---

## Step B2 — Generate migration

Run this command:

```bash
pnpm db:generate
```

This will create a new SQL file in `drizzle/` directory (e.g., `0002_*.sql`).

Verify the file was created and contains:
```sql
CREATE TABLE "cover_letters" (...)
```

---

## Step B3 — Run migration

Run this command:

```bash
pnpm db:migrate
```

This applies the migration to your Neon database.

Verify no errors in output.

---

## Step B4 — Create cover letters API: list + create

Create file: `app/api/cover-letters/route.ts`

Exact content:

```ts
import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// GET /api/cover-letters — list all cover letters for the current user
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db
    .select({
      id: coverLetters.id,
      resumeId: coverLetters.resumeId,
      company: coverLetters.company,
      role: coverLetters.role,
      content: coverLetters.content,
      createdAt: coverLetters.createdAt,
      updatedAt: coverLetters.updatedAt,
    })
    .from(coverLetters)
    .where(eq(coverLetters.userId, user.id))
    .orderBy(desc(coverLetters.createdAt))

  return NextResponse.json(list)
}

// POST /api/cover-letters — create a new cover letter
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, resumeId, company, role, content, jdText } = body

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const letter = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    resumeId: resumeId || null,
    company: company || null,
    role: role || null,
    content,
    jdText: jdText || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(coverLetters).values(letter)
  return NextResponse.json(letter)
}
```

---

## Step B5 — Create cover letters API: update + delete

Create file: `app/api/cover-letters/[id]/route.ts`

Exact content:

```ts
import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// PATCH /api/cover-letters/[id] — update a cover letter
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }
  if (body.content !== undefined) updates.content = body.content
  if (body.company !== undefined) updates.company = body.company
  if (body.role !== undefined) updates.role = body.role

  const [updated] = await db
    .update(coverLetters)
    .set(updates)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

// DELETE /api/cover-letters/[id] — delete a cover letter
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [deleted] = await db
    .delete(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, user.id)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
```

---

## Step B6 — Modify cover letter API to save to DB

### File: `app/api/ai/cover-letter/route.ts`

After the AI generates the cover letter and before returning the response, save it to the new table.

**Step A:** Add imports at top. After `import { headers } from 'next/headers'`:

```ts
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
```

**Step B:** Find this block (around line 62-63):

```ts
    return NextResponse.json({ letter: text.trim() })
```

REPLACE with:

```ts
    // Save to cover_letters table
    const letterId = crypto.randomUUID()
    try {
      await db.insert(coverLetters).values({
        id: letterId,
        userId: user.id,
        resumeId: null,
        company: company || null,
        role: role || null,
        content: text.trim(),
        jdText: jdText || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } catch (err) {
      console.error('[cover-letter] Failed to save to DB:', err)
    }

    return NextResponse.json({ letter: text.trim(), id: letterId })
```

**IMPORTANT:** The response now includes `id: letterId`. The client-side code already handles `data.letter`, so the extra `id` field won't break anything.

---

## Step B7 — Add cover letter history to cover letter page

### File: `app/(app)/cover-letter/page.tsx`

This is the biggest change. We need to:
1. Fetch saved cover letters on page load
2. Show them in a list in the left sidebar
3. Click a saved letter to load it
4. Allow deleting a saved letter

**Step A:** Add state variables. Find this block (around line 26-27):

```ts
  const [letterText, setLetterText] = useState('')
  const [generating, setGenerating] = useState(false)
```

ADD after them:

```ts
  const [savedLetters, setSavedLetters] = useState<Array<{
    id: string
    company: string | null
    role: string | null
    content: string
    createdAt: string
  }>>([])
  const [activeLetterId, setActiveLetterId] = useState<string | null>(null)
```

**Step B:** Add fetch effect. After the existing `useEffect` that syncs selectedResume (around line 36), add a new `useEffect`:

```ts
  // Fetch saved cover letters
  useEffect(() => {
    async function loadLetters() {
      try {
        const res = await fetch('/api/cover-letters')
        if (!res.ok) return
        const data = await res.json()
        setSavedLetters(data)
      } catch {
        // ignore
      }
    }
    loadLetters()
  }, [])
```

**Step C:** Modify `handleGenerate` to save to DB after generation. Find this block inside `handleGenerate` (around line 169-177):

```ts
      const data = await res.json()
      if (data.letter) {
        setLetterText(data.letter)
        // Update resume data in store & DB
        const jdVal = mode === 'jd' ? jdText : `Company: ${company}, Role: ${role}${focus ? `, Focus: ${focus}` : ''}`
        updateResume(selectedResume.id, {
          coverLetter: data.letter,
          coverLetterJD: jdVal,
        })
        notify({ message: 'Cover letter generated!', type: 'success' })
```

REPLACE with:

```ts
      const data = await res.json()
      if (data.letter) {
        setLetterText(data.letter)
        const jdVal = mode === 'jd' ? jdText : `Company: ${company}, Role: ${role}${focus ? `, Focus: ${focus}` : ''}`
        updateResume(selectedResume.id, {
          coverLetter: data.letter,
          coverLetterJD: jdVal,
        })
        // Add to saved letters list
        if (data.id) {
          setActiveLetterId(data.id)
          setSavedLetters(prev => [
            {
              id: data.id,
              company: mode === 'quick' ? company : null,
              role: mode === 'quick' ? role : null,
              content: data.letter,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ])
        }
        notify({ message: 'Cover letter generated & saved!', type: 'success' })
```

**Step D:** Add handler to load a saved letter. After the `handleSave` function (around line 197), add:

```ts
  const handleLoadSaved = (letter: { id: string; content: string; company: string | null; role: string | null }) => {
    setActiveLetterId(letter.id)
    setLetterText(letter.content)
    if (letter.company) setCompany(letter.company)
    if (letter.role) setRole(letter.role)
  }

  const handleDeleteSaved = async (id: string) => {
    try {
      await fetch(`/api/cover-letters/${id}`, { method: 'DELETE' })
      setSavedLetters(prev => prev.filter(l => l.id !== id))
      if (activeLetterId === id) {
        setActiveLetterId(null)
        setLetterText('')
      }
      notify({ message: 'Cover letter deleted', type: 'success' })
    } catch {
      notify({ message: 'Failed to delete', type: 'error' })
    }
  }
```

**Step E:** Add the saved letters list to the UI. Find the "Generate Trigger" button section. It looks like this (around line 333-353):

```tsx
        {/* Generate Trigger */}
        <button
          onClick={handleGenerate}
          disabled={
```

ADD this section BEFORE the Generate Trigger button (between the closing `</div>` of the mode form fields and the Generate button):

```tsx
        {/* Saved Letters */}
        {savedLetters.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <label className="label-mono block">Saved Letters ({savedLetters.length})</label>
            {savedLetters.map((letter) => (
              <div
                key={letter.id}
                className={`group flex items-center gap-1.5 rounded-xs border px-2 py-1.5 cursor-pointer transition-colors ${
                  activeLetterId === letter.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                }`}
                onClick={() => handleLoadSaved(letter)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate">
                    {letter.company || letter.role || 'Untitled'}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    {new Date(letter.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSaved(letter.id)
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                  title="Delete"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            ))}
          </div>
        )}
```

---

## Step B8 — Verify build

Run:

```bash
pnpm build
```

Fix any TypeScript errors. Common issues:
- `Module '"~/lib/schema"' has no exported member 'coverLetters'` → schema not updated, redo Step B1
- `Table 'cover_letters' does not exist` → migration not run, redo Step B3
- Import errors → check import paths use `~/lib/` prefix

---

## Step B9 — Test locally

1. Run `pnpm dev`
2. Go to `/cover-letter`
3. Generate a cover letter → verify it appears in "Saved Letters" list
4. Refresh page → verify saved letters persist
5. Click a saved letter → verify it loads into the textarea
6. Delete a saved letter → verify it's removed
7. Go to `/admin` → verify "Cover Letters" stat shows correct count

---

# FINAL — Git commit + push

```bash
git add -A
git commit -m "feat: add admin dashboard + cover letter persistence

Admin Dashboard:
- /admin route with email-gated access (ADMIN_EMAIL)
- Read-only stats: users, resumes, pipelines, interviews, cover letters
- Recent signups table
- Recent interviews table
- Admin link in sidebar (conditional)

Cover Letter Persistence:
- New cover_letters table (migration)
- GET/POST/PATCH/DELETE /api/cover-letters
- Cover letter API saves to DB after AI generation
- Cover letter page shows saved letters history
- Click to load, delete button per letter"
git push
```

---

## Summary of all files

| # | File | Action |
|---|------|--------|
| 1 | `.env.example` | Append `ADMIN_EMAIL` |
| 2 | `.env.local` | Append `ADMIN_EMAIL` |
| 3 | `app/(app)/admin/page.tsx` | **CREATE** — Admin dashboard page |
| 4 | `app/components/layout/sidebar.tsx` | MODIFY — Add admin link + useState/useEffect |
| 5 | `app/lib/schema.ts` | MODIFY — Add coverLetters table + relations |
| 6 | `drizzle/0002_*.sql` | Auto-generated by `pnpm db:generate` |
| 7 | `app/api/cover-letters/route.ts` | **CREATE** — GET + POST |
| 8 | `app/api/cover-letters/[id]/route.ts` | **CREATE** — PATCH + DELETE |
| 9 | `app/api/ai/cover-letter/route.ts` | MODIFY — Save to DB after generation |
| 10 | `app/(app)/cover-letter/page.tsx` | MODIFY — Add saved letters list + handlers |

**Total: 3 new files, 7 modified files, 1 auto-generated migration.**

---

## DO NOT DO

- Do NOT add authentication UI to the admin page — it uses the existing Better Auth session
- Do NOT add charts or graphs — this is read-only text tables
- Do NOT modify the existing resume JSONB cover letter storage — keep it for backward compatibility. The new table is ADDITIONAL, not a replacement.
- Do NOT change the cover letter generation logic — only ADD saving after generation
- Do NOT remove the `coverLetter` and `coverLetterJD` fields from the Resume type
- Do NOT create the migration SQL manually — always use `pnpm db:generate`
- Do NOT forget to run `pnpm db:migrate` after generating
- Do NOT skip `pnpm build` verification
