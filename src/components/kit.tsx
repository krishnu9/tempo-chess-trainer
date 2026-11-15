'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const cx = cn

export {
  Badge,
  Button,
  Card,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
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
        <CardHeader className="border-b border-line">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent className={bodyClassName}>{children}</CardContent>
    </Card>
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
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={width}>
        <DialogHeader className="pr-12">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="py-1">{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
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
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel2 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {action}
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
    <div className={cn('flex h-1 overflow-hidden rounded-full bg-panel2 ring-1 ring-inset ring-line/60', className)}>
      {parts.map((p, i) => (
        <div key={i} style={{ width: `${p.value * 100}%`, backgroundColor: p.color }} title={p.label} />
      ))}
    </div>
  )
}
