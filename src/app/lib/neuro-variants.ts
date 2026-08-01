import { cva, type VariantProps } from "class-variance-authority"

/**
 * Neumorphic card/surface variant definitions.
 * Maps to CSS utility classes in globals.css (.neuro-*).
 * Dark mode neutralization is handled in globals.css — no JS needed.
 */
export const neuroCardVariants = cva(
  "transition-shadow duration-200",
  {
    variants: {
      variant: {
        surface: "neuro-surface",
        card: "neuro-card",
        inset: "neuro-inset",
        iconWell: "neuro-icon-well",
        modal: "neuro-modal",
      },
    },
    defaultVariants: {
      variant: "card",
    },
  }
)

export type NeuroCardVariantProps = VariantProps<typeof neuroCardVariants>
