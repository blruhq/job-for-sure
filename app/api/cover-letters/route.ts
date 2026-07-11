import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { z } from 'zod'

// GET /api/cover-letters — list all cover letters for the current user
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db
    .select({
      id: coverLetters.id,
      resumeId: coverLetters.resumeId,
      company: coverLetters.company,
      role: coverLetters.role,
      content: coverLetters.content,
      createdAt: coverLetters.createdAt,
      updatedAt: coverLetters.updatedAt,
    })
    .from(coverLetters)
    .where(and(eq(coverLetters.userId, user.id), isNull(coverLetters.deletedAt)))
    .orderBy(desc(coverLetters.createdAt))

  return NextResponse.json(list)
}

const CreateCoverLetterBody = z.object({
  id: z.string().max(100).optional(),
  resumeId: z.string().max(100).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(20000),
  jdText: z.string().max(20000).nullable().optional(),
})

// POST /api/cover-letters — create a new cover letter
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkGeneralRateLimit(user.id)
  if (limited) return limited

  const body = CreateCoverLetterBody.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Valid content is required' }, { status: 400 })
  }

  const { id, resumeId, company, role, content, jdText } = body.data

  const letter = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    resumeId: resumeId || null,
    company: company || null,
    role: role || null,
    content,
    jdText: jdText || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(coverLetters).values(letter)
  return NextResponse.json(letter)
}
