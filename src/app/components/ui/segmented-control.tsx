import * as React from "react"
import { cn } from "~/lib/utils"

/**
 * Segmented toggle control (neumorphic pill style).
 * Renders plain <button> elements inside a neuro-inset wrapper.
 *
 * @example
 * <SegmentedControl
 *   value={mode}
 *   onChange={setMode}
 *   options={[
 *     { value: "quick", label: "Quick" },
 *     { value: "jd", label: "Job Description" },
 *   ]}
 * />
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn("flex gap-1.5 rounded-sm neuro-inset p-0.5 shrink-0", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center",
            value === opt.value
              ? "neuro-card text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export { SegmentedControl }
