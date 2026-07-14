import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { userPreferences } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const PrefsBody = z.object({
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
})

export const GET = withAuth(async (_req, { user }) => {
  let prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1)
    .then(rows => rows[0])

  if (!prefs) {
    const defaults = {
      userId: user.id,
      emailNotifications: true,
      weeklyDigest: false,
      marketingEmails: false,
    }
    await db.insert(userPreferences).values(defaults)
    prefs = defaults as typeof prefs
  }

  return NextResponse.json(prefs)
}, { route: '/api/user/preferences' })

export const PUT = withAuth(async (req, { user }) => {
  const body = PrefsBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 })
  }

  const update: Record<string, boolean | Date> = { updatedAt: new Date() }
  if (body.data.emailNotifications !== undefined) update.emailNotifications = body.data.emailNotifications
  if (body.data.weeklyDigest !== undefined) update.weeklyDigest = body.data.weeklyDigest
  if (body.data.marketingEmails !== undefined) update.marketingEmails = body.data.marketingEmails

  await db
    .insert(userPreferences)
    .values({ userId: user.id, ...body.data })
    .onConflictDoUpdate({ target: userPreferences.userId, set: update })

  const prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1)
    .then(rows => rows[0])

  return NextResponse.json(prefs)
}, { rateLimitType: 'general', route: '/api/user/preferences' })
