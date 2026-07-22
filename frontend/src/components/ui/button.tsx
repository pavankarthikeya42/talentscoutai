import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0',
          'hover:from-blue-700 hover:to-violet-700',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_20px_rgba(139,92,246,0.4),0_3px_8px_rgba(59,130,246,0.3)]',
          'shadow-[0_2px_8px_rgba(99,102,241,0.2)]',
        ].join(' '),
        destructive: [
          'bg-gradient-to-r from-red-500 to-rose-600 text-white border-0',
          'hover:from-red-600 hover:to-rose-700',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_8px_20px_rgba(239,68,68,0.35)]',
        ].join(' '),
        outline: [
          'border border-indigo-200 bg-white/80 text-slate-700 backdrop-blur-sm',
          'hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_6px_16px_rgba(99,102,241,0.18),0_2px_6px_rgba(139,92,246,0.12)]',
        ].join(' '),
        secondary: [
          'bg-slate-100 text-slate-800 border border-slate-200',
          'hover:bg-slate-200 hover:border-slate-300',
          'hover:-translate-y-0.5',
          'hover:shadow-[0_4px_12px_rgba(99,102,241,0.12)]',
        ].join(' '),
        ghost: [
          'text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-700',
          'hover:shadow-[0_2px_8px_rgba(99,102,241,0.1)]',
        ].join(' '),
        link: 'text-indigo-600 underline-offset-4 hover:underline hover:text-violet-600',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 rounded-lg px-3 text-xs',
        lg:      'h-11 rounded-xl px-8 text-base',
        icon:    'h-9 w-9 rounded-xl',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
