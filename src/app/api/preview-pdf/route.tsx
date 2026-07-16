import { NextResponse } from 'next/server'
import ReactPDF from '@react-pdf/renderer'
import { ResumePDF } from '~/components/resume/resume-pdf'
import { withAuth } from '~/lib/with-auth'
import { ResumeDataSchema } from '~/lib/schemas'
import { registerFonts } from '~/components/resume/templates/shared-pdf'

export const runtime = 'nodejs'
export const maxDuration = 10

// POST /api/preview-pdf
// Accepts resume data in the body, returns a PDF stream for inline display.
// This keeps @react-pdf/renderer on the server (~2MB savings on client bundle).
export const POST = withAuth(async (request, { user }) => {
  console.log('[preview-pdf] Request from user:', user.id)

  let body
  try {
    body = await request.json()
  } catch {
    console.error('[preview-pdf] Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate the resume data
  const result = ResumeDataSchema.safeParse(body?.resume)
  if (!result.success) {
    console.error('[preview-pdf] Validation failed:', result.error.issues.slice(0, 3))
    return NextResponse.json(
      { error: 'Invalid resume data', details: result.error.issues.slice(0, 3) },
      { status: 400 },
    )
  }

  console.log('[preview-pdf] Validated, generating PDF...')

  // Ensure fonts are registered (idempotent)
  registerFonts()

  try {
    const doc = <ResumePDF resume={result.data as any} />
    const stream = await ReactPDF.renderToStream(doc)

    // Buffer the stream
    const chunks: Uint8Array[] = []
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    console.log('[preview-pdf] Generated, size:', buffer.length)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[preview-pdf] Generation failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate PDF preview' },
      { status: 500 },
    )
  }
}, { rateLimitType: 'general', route: '/api/preview-pdf' })
