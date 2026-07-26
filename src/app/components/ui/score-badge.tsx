import * as React from "react"
import { cn } from "~/lib/utils"

/**
 * Score badge with threshold-based color.
 * - score >= 75 → success (green)
 * - score >= 50 → warn (amber)
 * - score < 50  → muted or danger (controlled by `lowTone`)
 *
 * @example
 * <ScoreBadge score={job.score} className="shrink-0 px-2 py-0.5 text-xs" />
 * <ScoreBadge score={resume.score} lowTone="danger" className="px-1.5 py-0.5 text-xs" />
 * <ScoreBadge score={job.score} className="px-2 py-0.5 text-xs">{job.score}% Match</ScoreBadge>
 */
function ScoreBadge({
  score,
  lowTone = "muted",
  className,
  children,
}: {
  score: number
  lowTone?: "muted" | "danger"
  className?: string
  children?: React.ReactNode
}) {
  const tone =
    score >= 75
      ? "bg-success-soft text-success"
      : score >= 50
        ? "bg-warn-soft text-warn"
        : lowTone === "danger"
          ? "bg-danger-soft text-destructive"
          : "bg-muted text-muted-foreground"

  return (
    <span
      className={cn("rounded-xs font-mono font-semibold", tone, className)}
    >
      {children ?? `${score}%`}
    </span>
  )
}

export { ScoreBadge }
