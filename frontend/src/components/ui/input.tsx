import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-xl border border-indigo-100 bg-white/80 backdrop-blur-sm px-3 py-1 text-sm',
        'shadow-[0_1px_4px_rgba(99,102,241,0.08)] placeholder:text-slate-400',
        'transition-all duration-200 ease-out',
        'hover:border-indigo-200 hover:shadow-[0_2px_8px_rgba(99,102,241,0.12)]',
        'focus:outline-none focus:border-violet-400 focus:ring-0',
        'focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_2px_8px_rgba(99,102,241,0.1)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
