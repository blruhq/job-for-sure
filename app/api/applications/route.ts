import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applicationsData } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { EMPTY_APPLICATIONS } from '~/lib/constants'
import { ApplicationBoardSchema } from '~/lib/schemas'
import { eq } from 'drizzle-orm'

const ApplicationsBody = ApplicationBoardSchema

export const GET = withAuth(async (_req, { user }) => {
  const [row] = await db
    .select()
    .from(applicationsData)
    .where(eq(applicationsData.userId, user.id))
    .limit(1)

  return NextResponse.json(row?.data ?? EMPTY_APPLICATIONS)
}, { route: '/api/applications' })

export const POST = withAuth(async (req, { user }) => {
  const body = ApplicationsBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid application data' }, { status: 400 })
  }

  const data = body.data

  await db
    .insert(applicationsData)
    .values({ userId: user.id, data: JSON.stringify(data), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: applicationsData.userId,
      set: { data: JSON.stringify(data), updatedAt: new Date() },
    })

  await captureServerEvent(user.id, 'applications_updated')
  return NextResponse.json({ success: true })
}, { rateLimitType: 'general', route: '/api/applications' })
