import { Font } from '@react-pdf/renderer'

let registered = false

/**
 * Returns the correct font URL for the current environment.
 *
 * - Browser:  /fonts/{filename}  (served by Next.js from /public/)
 * - Vercel:   https://{deployment}/fonts/{filename}
 *             /public/ is NOT on the Lambda filesystem (/var/task/public/
 *             doesn't exist), so the server must fetch via the deployment URL.
 *             VERCEL_URL is set automatically for every deployment (incl.
 *             previews); VERCEL_PROJECT_PRODUCTION_URL is the prod fallback.
 * - Local dev: {process.cwd()}/public/fonts/{filename}  (filesystem path)
 */
function fontSrc(filename: string): string {
  // Browser: relative URL served from /public
  if (typeof window !== 'undefined') return `/fonts/${filename}`

  // Vercel serverless: fetch via production URL (NOT VERCEL_URL — SSO-gated).
  // VERCEL_PROJECT_PRODUCTION_URL is the production alias, never SSO-gated.
  // The hardcoded fallback covers preview deployments where only VERCEL is set.
  if (process.env.VERCEL) {
    const prodUrl =
      process.env.VERCEL_PROJECT_PRODUCTION_URL || 'job-for-sure-ecru.vercel.app'
    return `https://${prodUrl}/fonts/${filename}`
  }

  // Local dev: filesystem path (only works when /public is on disk)
  return `${process.cwd()}/public/fonts/${filename}`
}

export function registerFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'Inter',
    fonts: [
      { src: fontSrc('inter-regular.ttf'), fontWeight: 400 },
      { src: fontSrc('inter-italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
      { src: fontSrc('inter-medium.ttf'), fontWeight: 500 },
      { src: fontSrc('inter-semibold.ttf'), fontWeight: 600 },
      { src: fontSrc('inter-bold.ttf'), fontWeight: 700 },
    ],
  })

  Font.register({
    family: 'Lora',
    fonts: [
      { src: fontSrc('lora-regular.ttf'), fontWeight: 400 },
      { src: fontSrc('lora-medium.ttf'), fontWeight: 500 },
      { src: fontSrc('lora-semibold.ttf'), fontWeight: 600 },
      { src: fontSrc('lora-bold.ttf'), fontWeight: 700 },
      { src: fontSrc('lora-italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    ],
  })

  Font.register({
    family: 'JetBrains Mono',
    src: fontSrc('jetbrains-mono-regular.ttf'),
  })
}

/**
 * Convert a @react-pdf/renderer stream to a Buffer.
 * Eliminates the duplicated stream-buffering loop in export/pdf and preview-pdf routes.
 */
export async function pdfStreamToBuffer(
  stream: NodeJS.ReadableStream,
): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Shared spacing system — professional resume standards
export const SPACING = {
  pagePadding: 40,
  sectionGap: 10,
  entryGap: 6,
  titleGap: 6,
  lineHeight: 1.35,
  lineHeightSerif: 1.5,
  nameToRole: 4,
} as const

// Shared color palette matching the app's design tokens
export const COLORS = {
  ink: '#1C1B16',
  text: '#2D2D2A',
  muted: '#71706A',
  border: '#E6E5DF',
  primary: '#8B6F47',
  primarySoft: 'rgba(139, 111, 71, 0.08)',
  sidebarBg: '#F8F8F5',
  white: '#FFFFFF',
  dark: '#1C1B18',
} as const
