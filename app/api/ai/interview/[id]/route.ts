import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { interviewSessions } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// DELETE /api/ai/interview/[id] — soft delete an interview session
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [updated] = await db
    .update(interviewSessions)
    .set({ deletedAt: new Date() })
    .where(and(eq(interviewSessions.id, id), eq(interviewSessions.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
