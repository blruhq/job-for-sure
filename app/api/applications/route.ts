import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applicationsData } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const EMPTY_APPLICATIONS = { bookmark: [], applied: [], interviewing: [], offers: [] }

const ApplicationsBody = z.object({
  bookmark: z.array(z.record(z.unknown())).optional(),
  applied: z.array(z.record(z.unknown())).optional(),
  interviewing: z.array(z.record(z.unknown())).optional(),
  offers: z.array(z.record(z.unknown())).optional(),
}).passthrough()

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
