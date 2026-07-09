import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// GET /api/resumes — list all resumes for the current user
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, user.id))
    .orderBy(resumes.createdAt)

  return NextResponse.json(list)
}

// POST /api/resumes — create a new resume
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, data, isBase } = body

  const resume = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    data: JSON.stringify(data),
    isBase: isBase ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(resumes).values(resume)
  return NextResponse.json(resume)
}
