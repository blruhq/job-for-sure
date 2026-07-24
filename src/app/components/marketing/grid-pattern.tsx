import { cn } from '~/lib/utils'

interface GridPatternProps {
  children: React.ReactNode
  className?: string
  width?: number
  height?: number
  squares?: [number, number][]
}

export function GridPattern({
  children,
  className,
  width = 40,
  height = 40,
  squares = [
    [3, 3],
    [4, 1],
    [5, 4],
    [8, 2],
    [6, 6],
    [11, 3],
    [9, 7],
    [2, 8],
    [13, 5],
    [7, 10],
    [15, 8],
    [4, 11],
  ],
}: GridPatternProps) {
  const patternId = 'hero-grid'
  return (
    <div className="relative">
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          '[mask-image:radial-gradient(ellipse_at_50%_35%,black_15%,transparent_70%)]',
          '[-webkit-mask-image:radial-gradient(ellipse_at_50%_35%,black_15%,transparent_70%)]',
          className,
        )}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <pattern
              id={patternId}
              width={width}
              height={height}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${height} 0 L 0 0 0 ${height}`}
                fill="none"
                stroke="var(--border)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          {squares.map(([sx, sy]) => (
            <rect
              key={`${sx}-${sy}`}
              width={width - 1}
              height={height - 1}
              x={sx * width + 1}
              y={sy * height + 1}
              fill="var(--brand)"
              opacity="0.07"
            />
          ))}
        </svg>
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
