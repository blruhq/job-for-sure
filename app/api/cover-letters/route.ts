import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { z } from 'zod'

export const GET = withAuth(async (_req, { user }) => {
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
}, { route: '/api/cover-letters' })

const CreateCoverLetterBody = z.object({
  id: z.string().max(100).optional(),
  resumeId: z.string().max(100).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(20000),
  jdText: z.string().max(20000).nullable().optional(),
})

export const POST = withAuth(async (req, { user }) => {
  const body = CreateCoverLetterBody.safeParse(await req.json())
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
}, { rateLimitType: 'general', route: '/api/cover-letters' })
