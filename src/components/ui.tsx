import { X } from 'lucide-react'
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-bg font-semibold hover:brightness-110',
  outline: 'border border-line text-ink hover:bg-panel2',
  ghost: 'text-muted hover:bg-panel2 hover:text-ink',
  danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
  subtle: 'bg-panel2 text-ink hover:bg-line',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-lg justify-center',
}

export function Button({
  variant = 'subtle',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('min-w-0 rounded-xl border border-line bg-panel', className)} {...props}>
      {children}
    </div>
  )
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {title && <h2 className="text-[13px] font-semibold tracking-wide">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cx('p-4', bodyClassName)}>{children}</div>
    </Card>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'info'
  className?: string
}) {
  const tones = {
    neutral: 'bg-panel2 text-muted border-line',
    brand: 'bg-brand-soft text-brand border-brand/30',
    accent: 'bg-accent/10 text-accent border-accent/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    info: 'bg-info/10 text-info border-info/30',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Progress({
  value,
  className,
  tone = 'brand',
}: {
  value: number
  className?: string
  tone?: 'brand' | 'accent' | 'danger' | 'info'
}) {
  const tones = {
    brand: 'bg-brand',
    accent: 'bg-accent',
    danger: 'bg-danger',
    info: 'bg-info',
  }
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-panel2', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

export function Ring({
  value,
  size = 64,
  stroke = 6,
  label,
  tone = 'var(--brand)',
}: {
  value: number
  size?: number
  stroke?: number
  label?: ReactNode
  tone?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular">{label ?? `${Math.round(value * 100)}%`}</span>
    </div>
  )
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'h-9 rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-none transition-colors hover:border-muted/40',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-9 w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-brand/60',
        className,
      )}
      {...props}
    />
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cx('m-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-panel p-0 text-ink', width)}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
          <X size={16} />
        </Button>
      </div>
      <div className="px-4 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
    </dialog>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel2 text-muted">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-lg', className)} />
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: string; count?: number }[]
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-panel2/50 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cx(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === item.value ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {item.label}
          {item.count !== undefined && <span className="ml-1.5 text-[11px] text-muted">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function WdlBar({ w, d, b, className }: { w: number; d: number; b: number; className?: string }) {
  const total = Math.max(1, w + d + b)
  const parts = [
    { value: w / total, color: '#dbe2e8', label: 'White wins' },
    { value: d / total, color: '#8b949e', label: 'Draws' },
    { value: b / total, color: '#24292f', label: 'Black wins' },
  ]
  return (
    <div className={cx('flex h-1 overflow-hidden rounded-full bg-panel2 ring-1 ring-inset ring-line/60', className)}>
      {parts.map((p, i) => (
        <div key={i} style={{ width: `${p.value * 100}%`, backgroundColor: p.color }} title={p.label} />
      ))}
    </div>
  )
}
