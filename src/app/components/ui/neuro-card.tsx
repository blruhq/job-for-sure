import * as React from "react"
import { cn } from "~/lib/utils"
import { neuroCardVariants, type NeuroCardVariantProps } from "~/lib/neuro-variants"

/**
 * Neumorphic card/surface wrapper.
 * Uses CSS utility classes (.neuro-*) defined in globals.css.
 * In dark mode, all neumorphic effects are automatically neutralized to flat shadows.
 *
 * @example
 * <NeuroCard variant="card" className="rounded-lg p-4">Content</NeuroCard>
 * <NeuroCard variant="inset">Pressed-in content</NeuroCard>
 */
function NeuroCard({
  className,
  variant = "card",
  ...props
}: React.ComponentProps<"div"> & NeuroCardVariantProps) {
  return (
    <div
      data-slot="neuro-card"
      className={cn(neuroCardVariants({ variant }), className)}
      {...props}
    />
  )
}

export { NeuroCard, neuroCardVariants }
