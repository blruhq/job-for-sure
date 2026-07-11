import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

// GET /api/resumes/[id] — get a single resume
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .limit(1)

  if (!resume) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(resume)
}

const PatchResumeBody = z.object({
  data: z.record(z.unknown()).optional(),
  isBase: z.boolean().optional(),
})

// PATCH /api/resumes/[id] — update a resume
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = PatchResumeBody.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid update data' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }
  if (body.data.data !== undefined) updates.data = JSON.stringify(body.data.data)
  if (body.data.isBase !== undefined) updates.isBase = body.data.isBase

  const [updated] = await db
    .update(resumes)
    .set(updates)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

// DELETE /api/resumes/[id] — soft delete a resume
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [updated] = await db
    .update(resumes)
    .set({ deletedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
