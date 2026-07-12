/**
 * Server-side resume text extraction.
 * Supports: .pdf (unpdf), .docx (mammoth), .txt/.md/.text (plain).
 * .doc is rejected — user must save as .docx or PDF.
 */

import { extractText as unpdfExtractText, getDocumentProxy } from 'unpdf'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedFileError'
  }
}

/**
 * Extract text from a resume file (PDF, DOCX, TXT, MD).
 * Throws UnsupportedFileError for .doc or unknown formats.
 * Throws Error if extracted text is too short (< 50 chars).
 */
export async function extractTextFromFile(file: File | Blob, filename?: string): Promise<string> {
  const name = (filename || (file as File).name || '').toLowerCase()

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.')
  }

  let text: string

  if (name.endsWith('.pdf') || (file as File).type === 'application/pdf') {
    text = await extractPdfText(file)
  } else if (name.endsWith('.docx')) {
    text = await extractDocxText(file)
  } else if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.text')) {
    text = await file.text()
  } else if (name.endsWith('.doc')) {
    throw new UnsupportedFileError(
      'Legacy .doc format is not supported. Please save as .docx or PDF, then upload again.',
    )
  } else if (!name) {
    // No filename — try PDF first (most common), then plain text
    try {
      text = await extractPdfText(file)
    } catch {
      text = await file.text()
    }
  } else {
    throw new UnsupportedFileError(
      `Unsupported file format "${name.split('.').pop()}". Please upload .pdf, .docx, .txt, or .md.`,
    )
  }

  if (text.trim().length < 50) {
    throw new Error(
      'Could not extract enough text from this file. Try uploading as .docx or .txt, or use Build from Template.',
    )
  }

  return text
}

/**
 * Extract text from PDF using unpdf (server-side pdfjs, no CDN worker).
 */
async function extractPdfText(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
  const { text } = await unpdfExtractText(pdf, { mergePages: true })
  return text
}

/**
 * Extract text from DOCX using mammoth.
 */
async function extractDocxText(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
