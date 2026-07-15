# Phase 5 — Contact Tracker (Networking CRM)

> **Time:** 2-3 days
> **Depends on:** Phase 0 (schema). Phase 1 (panel) recommended.
> **Competitors:** Huntr ✓, Teal ✓. Simplify has networking copilot.

## What & Why

70% of jobs are filled through networking. Huntr and Teal both have a Contact Tracker — a mini-CRM for recruiters, hiring managers, and referrals. You have nothing.

Users meet recruiters during interviews, connect on LinkedIn, exchange emails. Without a contact tracker, they lose track of who said what. This feature lets them:
- Store contact details per person
- Link contacts to specific job applications
- Track last-contact date
- Write notes per contact

## Schema

### New table: `contacts`

**File:** `src/app/lib/schema.ts`

Add after the `applications` table:

```typescript
// ═══════════════════════════════════════════════════════════════
// CONTACTS (networking CRM)
// ═══════════════════════════════════════════════════════════════

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  role: text("role"),
  linkedinUrl: text("linkedin_url"),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  applicationId: text("application_id").references(() => applications.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("contacts_userId_idx").on(table.userId),
  index("contacts_company_idx").on(table.company),
])

export const contactsRelations = relations(contacts, ({ one, belongsTo }) => ({
  user: one(user, { fields: [contacts.userId], references: [user.id] }),
  application: one(applications, { fields: [contacts.applicationId], references: [applications.id] }),
}))
```

### Generate migration
```bash
pnpm db:generate
pnpm db:migrate
```

## API Routes

### `src/app/api/contacts/route.ts` (CREATE)

```typescript
import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { contacts } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { z } from 'zod'

const CreateContactSchema = z.object({
  name: z.string().max(300),
  email: z.string().max(254).optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(300).optional(),
  role: z.string().max(300).optional(),
  linkedinUrl: z.string().max(2048).optional(),
  notes: z.string().max(5000).optional(),
  applicationId: z.string().max(100).optional(),
})

export const GET = withAuth(async (_req, { user }) => {
  const list = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, user.id), isNull(contacts.deletedAt)))
    .orderBy(asc(contacts.name))

  return NextResponse.json(list)
}, { route: '/api/contacts' })

export const POST = withAuth(async (req, { user }) => {
  const body = CreateContactSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid contact data' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(contacts).values({
    id,
    userId: user.id,
    ...body.data,
    createdAt: now,
    updatedAt: now,
  })

  return NextResponse.json({ id, ...body.data })
}, { rateLimitType: 'general', route: '/api/contacts' })
```

### `src/app/api/contacts/[id]/route.ts` (CREATE)

Standard PATCH (update) + DELETE (soft-delete) handlers, following the same pattern as `applications/[id]/route.ts`.

## UI Components

### `src/app/components/contacts/contacts-view.tsx` (NEW)

Full contacts management page:

```
┌──────────────────────────────────────────────────────────┐
│  CONTACTS                              [+ Add Contact]   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 👤 Jane Doe                              [✏️] [🗑️] │ │
│  │    Recruiter at Acme Corp                           │ │
│  │    ✉️ jane@acme.com  📱 +66-81-234-5678            │ │
│  │    🔗 linkedin.com/in/janedoe                      │ │
│  │    📝 "Reached out on LinkedIn Jul 13.              │ │
│  │        Tech screen scheduled Jul 16."               │ │
│  │    Last contact: Jul 14                             │ │
│  │    Linked to: Senior FE Engineer @ Acme Corp        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 👤 John Smith                            [✏️] [🗑️] │ │
│  │    Engineering Manager at Beta Inc                  │ │
│  │    ...                                              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Features:
- Search/filter by company name
- Add contact modal (name, email, phone, company, role, LinkedIn, notes)
- Edit contact inline
- Soft-delete with confirmation
- Link to application (dropdown of existing applications)
- "Last contacted" auto-updates when notes are edited

### `src/app/components/pipeline/job-detail-panel.tsx` (EDIT)

In the job detail panel, add a "Contacts" section:
- Shows contacts linked to this application
- Quick-add button: "Add contact for this job"
- Displays name, role, email, phone

### New page: `src/app/[locale]/(app)/contacts/page.tsx`

Simple page that renders the contacts view.

### Sidebar nav: Add "Contacts" to ACCOUNT section

In `src/app/components/layout/sidebar.tsx`, add a contacts link:
```typescript
const NAV_ACCOUNT: readonly NavItem[] = [
  { href: '/contacts', labelKey: 'contacts', icon: Users },
  { href: '/settings', labelKey: 'settings', icon: Settings },
]
```

Add i18n key: `"contacts": "Contacts"` / `"contacts": "ผู้ติดต่อ"`

## Store Integration

Add to `src/app/lib/store.tsx`:

```typescript
// Contacts state
contacts: Contact[]
addContact: (contact: Contact) => void
updateContact: (id: string, updates: Partial<Contact>) => void
deleteContact: (id: string) => Promise<void>
```

Load contacts on hydration alongside applications:
```typescript
const [contacts, setContacts] = useState<Contact[]>([])
// In hydrate():
apiGet<Contact[]>('/api/contacts').catch(() => []),
```

## Acceptance Criteria

- [ ] Contacts table in database (with migration)
- [ ] GET/POST/PATCH/DELETE `/api/contacts` endpoints work
- [ ] Contacts page at `/contacts` shows all contacts
- [ ] Add contact form works (name, email, phone, company, role, LinkedIn, notes)
- [ ] Contacts linkable to applications
- [ ] Contacts visible in job detail panel
- [ ] Quick-add contact from job detail panel
- [ ] Search/filter by company
- [ ] Soft-delete with confirmation
- [ ] Contacts nav item in sidebar (ACCOUNT section)
- [ ] i18n keys added (EN + TH)
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
