'use client'
import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']
const LABELS = ['', '★ 保留觀察', '★★ 尚可', '★★★ 不錯', '★★★★ 精選', '★★★★★ 最佳']

export default function StarRating({ value, onChange, readonly, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 items-center">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={readonly}
            className={`star leading-none transition-all ${sizes[size]} ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            style={{ color: s <= display ? (COLORS[display] || '#f59e0b') : '#374151' }}
            onMouseEnter={() => !readonly && setHover(s)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => !readonly && onChange?.(s === value ? 0 : s)}
          >
            ★
          </button>
        ))}
        {value > 0 && (
          <span className="text-xs ml-1" style={{ color: COLORS[value] }}>
            {LABELS[value]}
          </span>
        )}
      </div>
    </div>
  )
}
