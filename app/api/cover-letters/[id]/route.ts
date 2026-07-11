import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { eq, and } from 'drizzle-orm'

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

// DELETE /api/cover-letters/[id] — soft delete a cover letter
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [updated] = await db
    .update(coverLetters)
    .set({ deletedAt: new Date() })
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
