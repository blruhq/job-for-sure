import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applications } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, inArray } from 'drizzle-orm'
import { ReorderApplicationSchema } from '~/lib/schemas'

// POST /api/applications/reorder — batch update status + position
export const POST = withAuth(async (req, { user }) => {
  const body = ReorderApplicationSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid reorder data' }, { status: 400 })
  }

  const { updates } = body.data
  const ids = updates.map((u) => u.id)

  // Verify ownership
  const owned = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.userId, user.id), inArray(applications.id, ids)))

  const ownedIds = new Set(owned.map((o) => o.id))

  for (const update of updates) {
    if (!ownedIds.has(update.id)) continue
    await db
      .update(applications)
      .set({
        status: update.status as 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected',
        position: update.position,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, update.id))
  }

  return NextResponse.json({ success: true })
}, { rateLimitType: 'general', route: '/api/applications/reorder' })
