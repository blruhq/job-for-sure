import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { ResumeDataSchema } from '~/lib/schemas'
import { MAX_RESUME_JSON_BYTES } from '~/lib/constants'

// GET /api/resumes/[id] — get a single resume
export const GET = withAuth(async (req, { user, params }) => {
  const { id } = params
  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .limit(1)

  if (!resume) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(resume)
})

const PatchResumeBody = z.object({
  data: ResumeDataSchema.optional(),
  isBase: z.boolean().optional(),
})

// PATCH /api/resumes/[id] — update a resume
export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = params
  const body = PatchResumeBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid update data' }, { status: 400 })
  }

  if (body.data.data) {
    const payloadSize = JSON.stringify(body.data.data).length
    if (payloadSize > MAX_RESUME_JSON_BYTES) {
      return NextResponse.json(
        { error: `Resume data too large (${payloadSize} bytes, max ${MAX_RESUME_JSON_BYTES})` },
        { status: 413 }
      )
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }
  if (body.data.data !== undefined) updates.data = JSON.stringify(body.data.data)
  if (body.data.isBase !== undefined) updates.isBase = body.data.isBase

  const [updated] = await db
    .update(resumes)
    .set(updates)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}, { rateLimitType: 'general', route: '/api/resumes/[id]' })

// DELETE /api/resumes/[id] — soft delete a resume
export const DELETE = withAuth(async (req, { user, params }) => {
  const { id } = params
  const [updated] = await db
    .update(resumes)
    .set({ deletedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
})
