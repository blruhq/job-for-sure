import { NextResponse } from 'next/server'
import ReactPDF from '@react-pdf/renderer'
import { ResumePDF } from '~/components/resume/resume-pdf'
import { CoverLetterPDF } from '~/components/resume/cover-letter-pdf'
import { db } from '~/lib/db'
import { resumes } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { eq, and } from 'drizzle-orm'

export const runtime = 'nodejs'

// GET /api/export/pdf?id=xxx&type=resume|cover-letter
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') || 'resume'

  if (!id) return NextResponse.json({ error: 'Missing resume id' }, { status: 400 })

  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

  const resume = typeof row.data === 'string' ? JSON.parse(row.data) : row.data

  // Generate PDF stream based on type
  const doc = type === 'cover-letter' 
    ? <CoverLetterPDF resume={resume} />
    : <ResumePDF resume={resume} />
  
  const stream = await ReactPDF.renderToStream(doc)

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  const filename = type === 'cover-letter'
    ? `${resume.name || 'resume'}-cover-letter.pdf`
    : `${resume.name || 'resume'}.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
