import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand font-semibold text-bg hover:brightness-110',
        outline: 'border border-line text-ink hover:bg-panel2',
        ghost: 'text-muted-foreground hover:bg-panel2 hover:text-ink',
        danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
        subtle: 'bg-panel2 text-ink hover:bg-line',
      },
      size: {
        sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
        md: 'h-9 gap-2 rounded-lg px-4 text-sm',
        lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
        icon: 'h-9 w-9 justify-center rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'subtle',
      size: 'md',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
