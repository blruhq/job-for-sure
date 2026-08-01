import Image from 'next/image'
import { cn } from '~/lib/utils'

const SIZE_MAP = {
  avatar: 'w-10 h-10 sm:w-12 sm:h-12',
  step: 'w-16 sm:w-20 md:w-24 max-h-[150px]',
  xs: 'w-24 sm:w-28 md:w-32 max-h-[200px]',
  sm: 'w-28 sm:w-36 md:w-44 max-h-[280px]',
  md: 'w-40 sm:w-52 md:w-64 max-h-[400px]',
  lg: 'w-56 sm:w-72 md:w-80 max-h-[500px]',
} as const

interface MascotProps {
  src: string
  alt: string
  size?: keyof typeof SIZE_MAP
  className?: string
  /** Set true for above-the-fold mascots (hero). Adds priority loading. */
  priority?: boolean
  /** "breathe" (default): subtle breathing animation. "static": no animation — for inline/inside-mockup use. */
  variant?: 'breathe' | 'static'
  /** Circular crop — for avatar use inside mockups. */
  circular?: boolean
}

export function Mascot({
  src,
  alt,
  size = 'md',
  className,
  priority = false,
  variant = 'breathe',
  circular = false,
}: MascotProps) {
  const isBreathing = variant === 'breathe'
  return (
    <div className={cn('relative pointer-events-none select-none', className)}>
      <Image
        src={src}
        alt={alt}
        width={850}
        height={1270}
        priority={priority}
        className={cn(
          circular
            ? 'object-cover drop-shadow-xl'
            : 'h-auto w-auto max-w-full object-contain drop-shadow-xl',
          SIZE_MAP[size],
          isBreathing && 'animate-mascot-breathe',
          circular && 'rounded-full aspect-square',
        )}
      />
    </div>
  )
}
