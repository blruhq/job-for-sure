import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { userPreferences } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

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

// PUT /api/user/preferences
export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { emailNotifications, weeklyDigest, marketingEmails } = body

  const update: Record<string, boolean> = {}
  if (typeof emailNotifications === 'boolean') update.emailNotifications = emailNotifications
  if (typeof weeklyDigest === 'boolean') update.weeklyDigest = weeklyDigest
  if (typeof marketingEmails === 'boolean') update.marketingEmails = marketingEmails
  update.updatedAt = new Date()

  await db
    .insert(userPreferences)
    .values({ userId: user.id, ...update } as any)
    .onConflictDoUpdate({ target: userPreferences.userId, set: update as any })

  const prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1)
    .then(rows => rows[0])

  return NextResponse.json(prefs)
}
