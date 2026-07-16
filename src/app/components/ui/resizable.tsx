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
        'relative flex w-1.5 items-center justify-center bg-border transition-colors',
        'hover:bg-primary/40 active:bg-primary/60',
        'after:absolute after:h-8 after:w-1 after:rounded-full after:bg-muted-foreground/30',
        'hover:after:bg-primary after:transition-colors',
        'data-[resize-handle-state=drag]:bg-primary data-[resize-handle-state=drag]:after:bg-primary',
        'hidden lg:flex',  // Hidden on mobile — mobile uses tab toggle
        className,
      )}
      {...props}
    />
  )
}

// Re-export for convenience
export { Panel, Group, Separator }
export { useDefaultLayout } from 'react-resizable-panels'
