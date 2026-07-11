import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq, and, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

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

// PATCH /api/resumes/[id] — update a resume
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
  if (body.data !== undefined) updates.data = JSON.stringify(body.data)
  if (body.isBase !== undefined) updates.isBase = body.isBase

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
