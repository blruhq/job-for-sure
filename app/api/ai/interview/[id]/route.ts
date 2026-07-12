import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { interviewSessions } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and } from 'drizzle-orm'

export const DELETE = withAuth<{ id: string }>(async (_req, { user, params }) => {
  const { id } = params
  const [updated] = await db
    .update(interviewSessions)
    .set({ deletedAt: new Date() })
    .where(and(eq(interviewSessions.id, id), eq(interviewSessions.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}, { route: '/api/ai/interview/[id]' })
