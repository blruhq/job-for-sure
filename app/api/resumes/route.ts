import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'

// GET /api/resumes — list all resumes for the current user
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .orderBy(resumes.createdAt)

  return NextResponse.json(list)
}

const CreateResumeBody = z.object({
  id: z.string().max(100).optional(),
  data: z.record(z.unknown()),
  isBase: z.boolean().optional(),
})

// POST /api/resumes — create a new resume
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkGeneralRateLimit(user.id)
  if (limited) return limited

  const body = CreateResumeBody.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 })
  }

  const { id, data, isBase } = body.data

  const resume = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    data: JSON.stringify(data),
    isBase: isBase ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(resumes).values(resume).onConflictDoUpdate({
    target: resumes.id,
    set: { data: resume.data, updatedAt: new Date() },
  })
  return NextResponse.json(resume)
}
