import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applications } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, inArray, isNull } from 'drizzle-orm'
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
    .where(
      and(
        eq(applications.userId, user.id),
        inArray(applications.id, ids),
        isNull(applications.deletedAt),
      ),
    )

  const ownedIds = new Set(owned.map((o) => o.id))

  await db.transaction(async (tx) => {
    for (const update of updates) {
      if (!ownedIds.has(update.id)) continue
      const setFields: Record<string, unknown> = {
        status: update.status as 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected',
        position: update.position,
        updatedAt: new Date(),
      }
      // Set appliedAt when transitioning to 'applied'
      if (update.status === 'applied') {
        setFields.appliedAt = new Date()
      }
      await tx
        .update(applications)
        .set(setFields)
        .where(eq(applications.id, update.id))
    }
  })

  return NextResponse.json({ success: true })
}, { rateLimitType: 'general', route: '/api/applications/reorder' })
