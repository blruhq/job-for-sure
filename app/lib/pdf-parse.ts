/**
 * Extract text from a PDF file using PDF.js (client-side).
 * Returns the full text content of all pages.
 */

let pdfjs: typeof import('pdfjs-dist') | null = null

async function getPdfjs() {
  if (!pdfjs) {
    pdfjs = await import('pdfjs-dist')
    // Use CDN worker to avoid bundling issues
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  }
  return pdfjs
}

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfjsLib = await getPdfjs()

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    
    // Group text items by Y coordinate with a baseline tolerance of 5px
    const tolerance = 5
    const rows: { y: number; items: any[] }[] = []

    for (const item of content.items) {
      if (!('str' in item)) continue // Skip TextMark elements
      const textItem = item as any
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
          if (gap > 4) {
            const spaces = Math.min(10, Math.max(1, Math.round(gap / 6)))
            rowString += ' '.repeat(spaces)
          }
        }

        rowString += item.str
        lastX = x
        lastWidth = item.width
      }

      return rowString
    }).join('\n')

    pages.push(pageText)
  }

  return pages.join('\n\n')
}
