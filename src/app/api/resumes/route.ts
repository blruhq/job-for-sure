import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { ResumeDataSchema } from '~/lib/schemas'
import { MAX_RESUME_JSON_BYTES } from '~/lib/constants'

// GET /api/resumes — list all resumes for the current user
export const GET = withAuth(async (req, { user }) => {
  const list = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .orderBy(resumes.createdAt)

  return NextResponse.json(list)
})

const CreateResumeBody = z.object({
  id: z.string().max(100).optional(),
  data: ResumeDataSchema,
  isBase: z.boolean().optional(),
})

// POST /api/resumes — create a new resume
export const POST = withAuth(async (req, { user }) => {
  const body = CreateResumeBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 })
  }

  const { id, data, isBase } = body.data

  // Enforce max payload size
  const payloadSize = JSON.stringify(data).length
  if (payloadSize > MAX_RESUME_JSON_BYTES) {
    return NextResponse.json(
      { error: `Resume data too large (${payloadSize} bytes, max ${MAX_RESUME_JSON_BYTES})` },
      { status: 413 }
    )
  }

  const resume = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    data: data,
    isBase: isBase ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(resumes).values(resume).onConflictDoUpdate({
    target: resumes.id,
    set: { data: resume.data, updatedAt: new Date() },
  })

  // FIX: Return data as a parsed object (matching GET shape),
  // not as a raw stringified JSON.
  return NextResponse.json({ ...resume, data })
}, { rateLimitType: 'general', route: '/api/resumes' })
