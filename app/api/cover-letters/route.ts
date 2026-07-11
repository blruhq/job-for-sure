import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { coverLetters } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq, desc } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

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
    .where(eq(coverLetters.userId, user.id))
    .orderBy(desc(coverLetters.createdAt))

  return NextResponse.json(list)
}

// POST /api/cover-letters — create a new cover letter
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, resumeId, company, role, content, jdText } = body

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

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
