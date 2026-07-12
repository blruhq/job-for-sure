import { Font } from '@react-pdf/renderer'
import path from 'node:path'

let registered = false

export function registerFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(process.cwd(), 'public', 'fonts', 'inter-regular.ttf'), fontWeight: 400 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'inter-medium.ttf'), fontWeight: 500 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'inter-semibold.ttf'), fontWeight: 600 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'inter-bold.ttf'), fontWeight: 700 },
    ],
  })

  Font.register({
    family: 'Lora',
    fonts: [
      { src: path.join(process.cwd(), 'public', 'fonts', 'lora-regular.ttf'), fontWeight: 400 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'lora-medium.ttf'), fontWeight: 500 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'lora-semibold.ttf'), fontWeight: 600 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'lora-bold.ttf'), fontWeight: 700 },
      { src: path.join(process.cwd(), 'public', 'fonts', 'lora-italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    ],
  })

  Font.register({
    family: 'JetBrains Mono',
    src: path.join(process.cwd(), 'public', 'fonts', 'jetbrains-mono-regular.ttf'),
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
