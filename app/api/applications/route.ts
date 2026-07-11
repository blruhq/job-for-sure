import { NextResponse } from 'next/server'
import { captureServerEvent } from '~/lib/posthog-server'
import { db } from '~/lib/db'
import { applicationsData } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const EMPTY_APPLICATIONS = { bookmark: [], applied: [], interviewing: [], offers: [] }

// GET /api/applications — get the user's application board
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db
    .select()
    .from(applicationsData)
    .where(eq(applicationsData.userId, user.id))
    .limit(1)

  return NextResponse.json(row?.data ?? EMPTY_APPLICATIONS)
}

const ApplicationsBody = z.object({
  data: z.object({
    bookmark: z.array(z.record(z.unknown())).optional(),
    applied: z.array(z.record(z.unknown())).optional(),
    interviewing: z.array(z.record(z.unknown())).optional(),
    offers: z.array(z.record(z.unknown())).optional(),
  }).passthrough().optional(),
}).passthrough()

// POST /api/applications — save the user's entire application board
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkGeneralRateLimit(user.id)
  if (limited) return limited

  const body = ApplicationsBody.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid application data' }, { status: 400 })
  }

  const data = body.data.data ?? body.data

  await db
    .insert(applicationsData)
    .values({ userId: user.id, data: JSON.stringify(data), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: applicationsData.userId,
      set: { data: JSON.stringify(data), updatedAt: new Date() },
    })

  await captureServerEvent(user.id, 'applications_updated')
  return NextResponse.json({ success: true })
}
