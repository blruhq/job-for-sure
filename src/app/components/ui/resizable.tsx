'use client'

import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from 'react-resizable-panels'
import { cn } from '~/lib/utils'

export interface ResizableGroupProps extends Omit<GroupProps, 'orientation'> {
  direction?: 'horizontal' | 'vertical'
}

// Wrapper components that match the project's existing UI patterns
export function ResizableGroup({ className, direction, ...props }: ResizableGroupProps) {
  const orientation = direction === 'vertical' ? 'vertical' : 'horizontal'
  return <Group className={cn('flex h-full w-full', className)} orientation={orientation} {...props} />
}

export function ResizablePanel({ className, ...props }: PanelProps) {
  return <Panel className={className} {...props} />
}

export function ResizableHandle({ className, ...props }: SeparatorProps) {
  return (
    <Separator
      className={cn(
        // Wide hit area (24px) with an inner pill for the visual bar.
        // react-resizable-panels applies `data-separator` attribute:
        //   "inactive" | "hover" | "active" (dragging) | "focus" | "disabled"
        'group relative flex w-6 items-center justify-center bg-transparent transition-colors',
        'hover:bg-primary/10',
        'data-[separator=active]:bg-primary/20',
        'hidden lg:flex',  // Hidden on mobile — mobile uses tab toggle
        className,
      )}
      {...props}
    >
      <div className="h-8 w-1 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary group-data-[separator=active]:bg-primary" />
    </Separator>
  )
}

// Re-export for convenience
export { Panel, Group, Separator }
export { useDefaultLayout } from 'react-resizable-panels'
