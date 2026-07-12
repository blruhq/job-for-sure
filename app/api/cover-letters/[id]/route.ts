import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const PatchCoverLetterBody = z.object({
  content: z.string().max(20000).optional(),
  company: z.string().max(200).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
})

export const PATCH = withAuth<{ id: string }>(async (req, { user, params }) => {
  const { id } = params
  const body = PatchCoverLetterBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid update data' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.data.content !== undefined) updates.content = body.data.content
  if (body.data.company !== undefined) updates.company = body.data.company
  if (body.data.role !== undefined) updates.role = body.data.role

  const [updated] = await db
    .update(coverLetters)
    .set(updates)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}, { route: '/api/cover-letters/[id]' })

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const { id } = params
  const [updated] = await db
    .update(coverLetters)
    .set({ deletedAt: new Date() })
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}, { route: '/api/cover-letters/[id]' })
