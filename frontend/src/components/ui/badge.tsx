import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
    'transition-all duration-200 ease-out',
    'cursor-default select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-blue-100 text-blue-800 border border-blue-200/60',
          'hover:bg-blue-200 hover:shadow-[0_2px_10px_rgba(59,130,246,0.3)]',
          'hover:scale-105',
        ].join(' '),
        secondary: [
          'bg-slate-100 text-slate-700 border border-slate-200/60',
          'hover:bg-slate-200 hover:shadow-[0_2px_8px_rgba(99,102,241,0.15)]',
          'hover:scale-105',
        ].join(' '),
        destructive: [
          'bg-red-100 text-red-800 border border-red-200/60',
          'hover:bg-red-200 hover:shadow-[0_2px_10px_rgba(239,68,68,0.3)]',
          'hover:scale-105',
        ].join(' '),
        success: [
          'bg-emerald-100 text-emerald-800 border border-emerald-200/60',
          'hover:bg-emerald-200 hover:shadow-[0_2px_10px_rgba(16,185,129,0.3)]',
          'hover:scale-105',
        ].join(' '),
        warning: [
          'bg-amber-100 text-amber-800 border border-amber-200/60',
          'hover:bg-amber-200 hover:shadow-[0_2px_10px_rgba(245,158,11,0.3)]',
          'hover:scale-105',
        ].join(' '),
        purple: [
          'bg-violet-100 text-violet-800 border border-violet-200/60',
          'hover:bg-violet-200 hover:shadow-[0_2px_10px_rgba(139,92,246,0.35)]',
          'hover:scale-105',
        ].join(' '),
        outline: [
          'border border-indigo-200 text-indigo-700 bg-white/60',
          'hover:bg-indigo-50 hover:shadow-[0_2px_8px_rgba(99,102,241,0.2)]',
          'hover:scale-105',
        ].join(' '),
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
