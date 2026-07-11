import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { userPreferences } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// GET /api/user/preferences
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1)
    .then(rows => rows[0])

  // Create default preferences if none exist
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
}

const PrefsBody = z.object({
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
})

// PUT /api/user/preferences
export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkGeneralRateLimit(user.id)
  if (limited) return limited

  const body = PrefsBody.safeParse(await request.json())
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
}
