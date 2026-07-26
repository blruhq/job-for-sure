import * as React from "react"

import { cn } from "~/lib/utils"

/**
 * @deprecated The `neumorphic` prop name will be aliased to `variant="soft"` later.
 * It now emits a WCAG-compliant hybrid soft textarea (crisp 3:1 border + softened inset shadow).
 */
function Textarea({ className, neumorphic = false, ...props }: React.ComponentProps<"textarea"> & { neumorphic?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        neumorphic
          ? "flex field-sizing-content min-h-16 w-full rounded-md neuro-input px-3 py-2 text-base transition-shadow outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
          : "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
