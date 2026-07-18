import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull, count } from 'drizzle-orm'
import { z } from 'zod'
import { ResumeDataSchema } from '~/lib/schemas'
import { MAX_RESUME_JSON_BYTES } from '~/lib/constants'
import { getEffectivePlan } from '~/lib/plan'

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

  // ── Feature gate: resume limit (free: 3 total) ──
  const effectivePlan = getEffectivePlan(user.role, user.plan)
  if (effectivePlan === 'free' && (isBase ?? true)) {
    const [row] = await db
      .select({ total: count() })
      .from(resumes)
      .where(and(eq(resumes.userId, user.id), eq(resumes.isBase, true), isNull(resumes.deletedAt)))
    if ((row?.total ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Resume limit reached (max 3 on Free plan)', upgradeUrl: '/pricing' },
        { status: 402 },
      )
    }
  }

  // Enforce max payload size
  const payloadSize = JSON.stringify(data).length
  if (payloadSize > MAX_RESUME_JSON_BYTES) {
    return NextResponse.json(
      { error: `Resume data too large (${payloadSize} bytes, max ${MAX_RESUME_JSON_BYTES})` },
      { status: 413 }
    )
  }

  // If client provided an id, verify ownership before upsert
  if (id) {
    const [existing] = await db
      .select({ userId: resumes.userId })
      .from(resumes)
      .where(eq(resumes.id, id))
      .limit(1)
    if (existing && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
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
    set: { data: resume.data, isBase: resume.isBase, updatedAt: new Date() },
  })

  // FIX: Return data as a parsed object (matching GET shape),
  // not as a raw stringified JSON.
  return NextResponse.json({ ...resume, data })
}, { rateLimitType: 'general', route: '/api/resumes' })
