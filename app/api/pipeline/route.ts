import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { pipelineData } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

const EMPTY_PIPELINE = { bookmark: [], applied: [], interviewing: [], offers: [] }

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// GET /api/pipeline — get the user's pipeline
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db
    .select()
    .from(pipelineData)
    .where(eq(pipelineData.userId, user.id))
    .limit(1)

  return NextResponse.json(row?.data ?? EMPTY_PIPELINE)
}

// POST /api/pipeline — save the user's entire pipeline
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const data = body.data ?? body

  await db
    .insert(pipelineData)
    .values({ userId: user.id, data: JSON.stringify(data), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: pipelineData.userId,
      set: { data: JSON.stringify(data), updatedAt: new Date() },
    })

  return NextResponse.json({ success: true })
}
