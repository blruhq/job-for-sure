import { NextResponse } from 'next/server'
import ReactPDF from '@react-pdf/renderer'
import { ResumePDF } from '~/components/resume/resume-pdf'
import { CoverLetterPDF } from '~/components/resume/cover-letter-pdf'
import { db } from '~/lib/db'
import { resumes, coverLetters } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { Resume } from '~/types/resume'

export const runtime = 'nodejs'

// GET /api/export/pdf?id=xxx&type=resume|cover-letter
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type') || 'resume'

  if (!id || id.length > 100) {
    return NextResponse.json({ error: 'Missing or invalid resume id' }, { status: 400 })
  }

  if (type !== 'resume' && type !== 'cover-letter') {
    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
  }

  // FIX: Added isNull(resumes.deletedAt) — previously soft-deleted resumes
  // could still be exported.
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Resume not found' }, { status: 404 })

  const resume = row.data as Resume

  // For cover letter, fetch the latest letter from the table
  let letterText = ''
  if (type === 'cover-letter') {
    const [latestLetter] = await db
      .select({ content: coverLetters.content })
      .from(coverLetters)
      .where(and(eq(coverLetters.userId, user.id), eq(coverLetters.resumeId, id), isNull(coverLetters.deletedAt)))
      .orderBy(desc(coverLetters.createdAt))
      .limit(1)
    letterText = latestLetter?.content || ''
  }

  // Generate PDF stream based on type
  const doc = type === 'cover-letter'
    ? <CoverLetterPDF resume={resume} letterText={letterText} />
    : <ResumePDF resume={resume} />

  let pdfBuffer: Uint8Array
  try {
    const stream = await ReactPDF.renderToStream(doc)

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    pdfBuffer = Buffer.concat(chunks)
  } catch (err) {
    console.error('[export-pdf] Generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }

  // Sanitize user-controlled resume.name for Content-Disposition.
  // Strip CRLF (header injection), quotes (breaks filename), and other unsafe chars.
  // Keep unicode letters/digits/spaces/dots/hyphens; collapse the rest to '_'.
  const safeName = (resume.name || 'resume')
    .replace(/[\r\n"]/g, '')
    .replace(/[^\w\u0080-\uFFFF .-]/g, '_')
    .slice(0, 60) || 'resume'

  const filename = type === 'cover-letter'
    ? `${safeName}-cover-letter.pdf`
    : `${safeName}.pdf`

  return new NextResponse(new Blob([pdfBuffer as BlobPart], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}, { rateLimitType: 'general', route: '/api/export/pdf' })
