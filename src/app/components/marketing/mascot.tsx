import Image from 'next/image'
import { cn } from '~/lib/utils'

const SIZE_MAP = {
  xs: 'w-24 sm:w-28 md:w-32',
  sm: 'w-28 sm:w-36 md:w-44',
  md: 'w-40 sm:w-52 md:w-64',
  lg: 'w-56 sm:w-72 md:w-80',
} as const

interface MascotProps {
  src: string
  alt: string
  size?: keyof typeof SIZE_MAP
  className?: string
  /** Glow color CSS. Defaults to primary amber. Use 'var(--gold-glow)' for gold tint. */
  glowColor?: string
  /** Set true for above-the-fold mascots (hero). Adds priority loading. */
  priority?: boolean
}

export function Mascot({
  src,
  alt,
  size = 'md',
  className,
  glowColor = 'var(--accent-soft)',
  priority = false,
}: MascotProps) {
  return (
    <div className={cn('relative pointer-events-none select-none', className)}>
      {/* Ambient glow — sits behind the mascot image */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-60"
        style={{ backgroundColor: glowColor }}
        aria-hidden="true"
      />
      {/* Mascot image — floats via CSS keyframe */}
      <Image
        src={src}
        alt={alt}
        width={850}
        height={1270}
        priority={priority}
        className={cn(
          'h-auto animate-mascot-float drop-shadow-xl',
          SIZE_MAP[size],
        )}
      />
    </div>
  )
}