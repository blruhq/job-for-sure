import { NextResponse } from 'next/server'
import ReactPDF from '@react-pdf/renderer'
import { ResumePDF } from '~/components/resume/resume-pdf'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'

export const runtime = 'nodejs'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// GET /api/export/pdf?id=xxx
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing resume id' }, { status: 400 })

  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

  const resume = typeof row.data === 'string' ? JSON.parse(row.data) : row.data

  // Generate PDF stream
  const stream = await ReactPDF.renderToStream(<ResumePDF resume={resume} />)

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resume.name || 'resume'}.pdf"`,
    },
  })
}
