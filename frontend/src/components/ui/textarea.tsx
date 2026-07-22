import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-indigo-100 bg-white/80 backdrop-blur-sm px-3 py-2 text-sm',
        'shadow-[0_1px_4px_rgba(99,102,241,0.08)] placeholder:text-slate-400',
        'transition-all duration-200 ease-out resize-none',
        'hover:border-indigo-200 hover:shadow-[0_2px_8px_rgba(99,102,241,0.12)]',
        'focus:outline-none focus:border-violet-400',
        'focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_2px_8px_rgba(99,102,241,0.1)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
