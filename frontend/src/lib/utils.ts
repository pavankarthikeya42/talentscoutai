import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatClosingLabel(closingDate?: string | null): string | null {
  if (!closingDate) return null
  const days = Math.ceil((new Date(closingDate).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  return `Closes in ${days} days`
}
