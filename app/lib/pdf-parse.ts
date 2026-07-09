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
    const text = content.items.map((item: any) => item.str).join(' ')
    pages.push(text)
  }

  return pages.join('\n\n')
}
