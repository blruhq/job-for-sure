import { NextResponse } from 'next/server'
import { captureServerEvent } from '~/lib/posthog-server'
import { db } from '~/lib/db'
import { applicationsData } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

const EMPTY_APPLICATIONS = { bookmark: [], applied: [], interviewing: [], offers: [] }

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

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

// POST /api/applications — save the user's entire application board
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const data = body.data ?? body

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
