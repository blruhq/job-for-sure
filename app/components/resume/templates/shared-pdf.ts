import { Font } from '@react-pdf/renderer'

let registered = false

/**
 * Returns the correct font URL for the current environment.
 * - Browser: /fonts/{filename} (served by Next.js from /public/)
 * - Server:  {process.cwd()}/public/fonts/{filename} (filesystem path)
 */
function fontSrc(filename: string): string {
  if (typeof window !== 'undefined') return `/fonts/${filename}`
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

// Shared color palette matching the app's design tokens
export const COLORS = {
  ink: '#1C1B16',
  text: '#2D2D2A',
  muted: '#71706A',
  border: '#E6E5DF',
  primary: '#5B6ABF',
  primarySoft: 'rgba(91, 106, 191, 0.08)',
  sidebarBg: '#F8F8F5',
  white: '#FFFFFF',
  dark: '#1C1B18',
} as const
