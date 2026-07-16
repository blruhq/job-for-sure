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
        'group relative flex w-6 items-center justify-center transition-colors',
        'bg-red-500/20 hover:bg-red-500/40',
        'data-[separator=active]:bg-red-500/60',
        'hidden lg:flex',
        className,
      )}
      {...props}
    >
      <div className="h-12 w-1 rounded-full bg-red-500 transition-colors" />
    </Separator>
  )
}

// Re-export for convenience
export { Panel, Group, Separator }
export { useDefaultLayout } from 'react-resizable-panels'
