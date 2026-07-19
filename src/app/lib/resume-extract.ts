/**
 * Server-side resume text extraction.
 * Supports: .pdf (unpdf), .docx (mammoth), .txt/.md/.text (plain).
 * .doc is rejected — user must save as .docx or PDF.
 */

import { getDocumentProxy } from 'unpdf'

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
    throw new UnsupportedFileError('File too large. Maximum size is 5MB.')
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
 * Extract text from PDF using spatial layout-preserving coordinate sorting.
 * Under the hood, this loops through pages of the PDF Document Proxy loaded via unpdf.
 */
async function extractPdfText(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Group text items by Y coordinate with a baseline tolerance of 5px
    type PdfTextItem = { str: string; transform: number[]; width?: number }
    const tolerance = 5
    const rows: { y: number; items: PdfTextItem[] }[] = []

    for (const item of content.items) {
      if (!('str' in item)) continue // Skip TextMark elements
      const textItem = item as unknown as PdfTextItem
      if (!textItem.str.trim() && textItem.str !== ' ') continue

      const y = textItem.transform[5] // Y coordinate in PDF viewport space

      // Find if there is already a row within the baseline tolerance
      const matchedRow = rows.find(row => Math.abs(row.y - y) <= tolerance)

      if (matchedRow) {
        matchedRow.items.push(textItem)
      } else {
        rows.push({ y, items: [textItem] })
      }
    }

    // Sort rows from top to bottom (Y coordinate is descending in PDF space)
    rows.sort((a, b) => b.y - a.y)

    const pageText = rows.map(row => {
      // Sort items in the row from left to right (X coordinate ascending)
      row.items.sort((a, b) => a.transform[4] - b.transform[4])

      let rowString = ''
      let lastX = 0
      let lastWidth = 0

      for (let idx = 0; idx < row.items.length; idx++) {
        const item = row.items[idx]
        const x = item.transform[4] // X coordinate

        if (idx > 0) {
          const gap = x - (lastX + lastWidth)
          // Insert spaces proportional to the visual gap (approx. 6px per space)
          // Even if the gap is slightly negative (up to -10px) due to font bounding box tolerances,
          // we still insert at least one space to separate distinct text fragments.
          if (gap > -10) {
            const spaces = Math.min(10, Math.max(1, Math.round(Math.max(0, gap) / 6)))
            rowString += ' '.repeat(spaces)
          }
        }

        rowString += item.str
        lastX = x
        lastWidth = item.width ?? 0
      }

      return rowString
    }).join('\n')

    pages.push(pageText)
  }

  return pages.join('\n\n')
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
