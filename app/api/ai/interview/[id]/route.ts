import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { interviewSessions } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { eq, and } from 'drizzle-orm'

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
