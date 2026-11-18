import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

const tones = {
  brand: 'bg-brand',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
} as const

function Progress({
  value = 0,
  tone = 'brand',
  className,
}: {
  value?: number
  tone?: keyof typeof tones
  className?: string
}) {
  const percent = Math.max(0, Math.min(1, value)) * 100
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={percent}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-panel2', className)}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
