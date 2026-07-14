import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applications } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { CreateApplicationSchema } from '~/lib/schemas'
import { eq, and, isNull, asc } from 'drizzle-orm'

// GET /api/applications — flat array of all user applications
export const GET = withAuth(async (_req, { user }) => {
  const list = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, user.id), isNull(applications.deletedAt)))
    .orderBy(asc(applications.position), asc(applications.createdAt))

  return NextResponse.json(list)
}, { route: '/api/applications' })

// POST /api/applications — create single application
export const POST = withAuth(async (req, { user }) => {
  const body = CreateApplicationSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid application data' }, { status: 400 })
  }

  const { sourceKey, company, jobTitle, jobUrl, location, salary, logoUrl, color, level, matchScore, resumeId, status } = body.data

  const id = crypto.randomUUID()
  const now = new Date()

  await db.insert(applications).values({
    id,
    userId: user.id,
    sourceKey,
    company,
    jobTitle,
    jobUrl: jobUrl || null,
    location: location || null,
    salary: salary || null,
    logoUrl: logoUrl || null,
    color: color || null,
    level: level || null,
    matchScore: matchScore ?? null,
    resumeId: resumeId || null,
    status: (status as 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected') || 'bookmarked',
    position: 0,
    appliedAt: status === 'applied' || status === 'interviewing' || status === 'offered' ? now : null,
    createdAt: now,
    updatedAt: now,
  })

  await captureServerEvent(user.id, 'applications_updated')
  return NextResponse.json({ id, ...body.data })
}, { rateLimitType: 'general', route: '/api/applications' })

// DELETE /api/applications — soft-delete ALL applications for user
export const DELETE = withAuth(async (_req, { user }) => {
  await db
    .update(applications)
    .set({ deletedAt: new Date() })
    .where(and(eq(applications.userId, user.id), isNull(applications.deletedAt)))

  return NextResponse.json({ success: true })
}, { route: '/api/applications' })
