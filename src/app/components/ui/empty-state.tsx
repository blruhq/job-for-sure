import * as React from "react"
import { cn } from "~/lib/utils"

/**
 * Centered empty-state layout with optional icon, title, description, and action slots.
 * All slots are ReactNode — the caller controls exact markup to preserve visual identity.
 *
 * @example
 * <EmptyState
 *   className="py-16"
 *   icon={<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well"><FileText size={24} /></div>}
 *   title={<h3 className="mb-1 text-sm font-semibold text-foreground">No data</h3>}
 *   description={<p className="text-sm text-muted-foreground">Add something to get started.</p>}
 *   action={<Button>Add Item</Button>}
 * />
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  children,
}: {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center", className)}
    >
      {icon}
      {title}
      {description}
      {action}
      {children}
    </div>
  )
}

export { EmptyState }
