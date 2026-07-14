import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applications } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

const PatchApplicationSchema = z.object({
  status: z.enum(['bookmarked', 'applied', 'interviewing', 'offered', 'rejected']).optional(),
  position: z.number().optional(),
  notes: z.string().max(5000).optional(),
})

// PATCH /api/applications/:id
export const PATCH = withAuth<{ id: string }>(async (req, { user, params }) => {
  const { id } = params
  const body = PatchApplicationSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid update data' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.data.status !== undefined) {
    updates.status = body.data.status
    if (body.data.status === 'applied') {
      updates.appliedAt = new Date()
    }
  }
  if (body.data.position !== undefined) updates.position = body.data.position
  if (body.data.notes !== undefined) updates.notes = body.data.notes

  const [updated] = await db
    .update(applications)
    .set(updates)
    .where(and(eq(applications.id, id), eq(applications.userId, user.id), isNull(applications.deletedAt)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}, { rateLimitType: 'general', route: '/api/applications/[id]' })

// DELETE /api/applications/:id
export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const { id } = params
  const [updated] = await db
    .update(applications)
    .set({ deletedAt: new Date() })
    .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}, { route: '/api/applications/[id]' })
