'use client'

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import { type ReactElement, cloneElement } from 'react'

interface TooltipProps {
  children: ReactElement
  label: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  disabled?: boolean
}

export function Tooltip({ children, label, side = 'right', align = 'center', disabled }: TooltipProps) {
  return (
    <BaseTooltip.Root disabled={disabled}>
      <BaseTooltip.Trigger
        delay={200}
        render={(props) => cloneElement(children, { ...props, key: undefined })}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} align={align} sideOffset={8} className="z-[100]">
          <BaseTooltip.Popup className="rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md">
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
