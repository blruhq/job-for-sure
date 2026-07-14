import { cn } from '~/lib/utils'

/**
 * Skeleton — a minimal, animated placeholder for loading states.
 * Uses a soft shimmer animation on the background.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xs bg-muted/70',
        className,
      )}
      {...props}
    />
  )
}

/**
 * SkeletonCard — a card-shaped skeleton with title, subtitle, and body lines.
 */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-sm" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-2.5 w-2/5" />
        </div>
        <Skeleton className="h-5 w-10 rounded-xs" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('mb-2 h-2.5', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  )
}

/**
 * SkeletonGauge — a circular gauge placeholder for ATS score.
 */
export function SkeletonGauge() {
  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-card p-4">
      <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-44" />
      </div>
    </div>
  )
}

/**
 * SkeletonColumn — a kanban column skeleton for pipeline loading.
 */
export function SkeletonColumn() {
  return (
    <div className="min-h-[200px] rounded-sm border border-border bg-card p-2.5">
      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-6 rounded-xs" />
      </div>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={1} />
      <Skeleton className="h-12 w-full rounded-xs" />
    </div>
  )
}

/**
 * SkeletonChatMessage — a chat message bubble skeleton.
 */
export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      {!isUser && <Skeleton className="h-7 w-7 shrink-0 rounded-sm" />}
      <div className={cn('space-y-1.5', isUser ? 'items-end' : '')}>
        <Skeleton className={cn('h-3', isUser ? 'w-40' : 'w-48')} />
        <Skeleton className={cn('h-3', isUser ? 'w-32' : 'w-56')} />
        {!isUser && <Skeleton className="h-3 w-36" />}
      </div>
    </div>
  )
}
