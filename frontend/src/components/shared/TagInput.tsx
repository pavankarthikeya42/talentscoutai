import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function TagInput({ value, onChange, placeholder = 'Type and press Enter', disabled }: TagInputProps) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInput('')
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white p-2 focus-within:ring-2 focus-within:ring-blue-500">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
          {tag}
          {!disabled && (
            <button type="button" onClick={() => remove(tag)} className="ml-0.5 hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      <Input
        className="h-6 min-w-24 flex-1 border-none p-0 shadow-none focus-visible:ring-0"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
      />
    </div>
  )
}
