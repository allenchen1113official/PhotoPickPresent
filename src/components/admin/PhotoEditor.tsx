'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import StarRating from './StarRating'
import ExifPanel from './ExifPanel'
import type { Photo } from '@/types'

const Histogram = dynamic(() => import('./Histogram'), { ssr: false })

interface PhotoEditorProps {
  photo: Photo
  onUpdate: (updated: Photo) => void
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function PhotoEditor({ photo, onUpdate, onClose, onPrev, onNext }: PhotoEditorProps) {
  const [rating, setRating] = useState(photo.rating)
  const [notes, setNotes] = useState(photo.notes || '')
  const [appreciation, setAppreciation] = useState(photo.appreciation || '')
  const [showPublic, setShowPublic] = useState(!!photo.show_public)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRating(photo.rating)
    setNotes(photo.notes || '')
    setAppreciation(photo.appreciation || '')
    setShowPublic(!!photo.show_public)
  }, [photo.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') onClose()
      if ((e.key === 'f' || e.key === 'F' || e.key === 'ArrowUp') && onPrev) { e.preventDefault(); onPrev() }
      if ((e.key === 'n' || e.key === 'N' || e.key === 'ArrowDown') && onNext) { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, notes, appreciation, show_public: showPublic ? 1 : 0 }),
      })
      const updated = await res.json()
      onUpdate(updated)
    } finally {
      setSaving(false)
    }
  }, [photo.id, rating, notes, appreciation, showPublic, onUpdate])

  const imageUrl = photo.thumbnail_url || photo.full_url || ''

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#2e2e2e]">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0">×</button>
          <h2 className="text-white font-medium truncate flex-1 text-sm">{photo.filename}</h2>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!onPrev}
              title="上一張 (F / ↑)"
              className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#2e2e2e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
            >‹</button>
            <button
              onClick={onNext}
              disabled={!onNext}
              title="下一張 (N / ↓)"
              className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#2e2e2e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg"
            >›</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Image */}
          <div className="flex-1 bg-[#111] flex items-center justify-center overflow-hidden min-w-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={photo.filename}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(95vh - 56px)' }}
              />
            ) : (
              <div className="text-gray-600">無預覽</div>
            )}
          </div>

          {/* Right: Panel */}
          <div className="w-80 flex flex-col gap-3 p-4 overflow-y-auto border-l border-[#2e2e2e] bg-[#161616]">
            {/* Histogram */}
            {imageUrl && <Histogram imageUrl={imageUrl} />}

            {/* EXIF */}
            <ExifPanel photo={photo} />

            {/* Rating */}
            <div className="rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">評分</h3>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            {/* Notes */}
            <div className="rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">拍攝備註</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#111] text-gray-200 text-sm rounded p-2 border border-[#2e2e2e] resize-none focus:outline-none focus:border-amber-500"
                rows={3}
                placeholder="記錄拍攝情境、技巧…"
              />
            </div>

            {/* Appreciation */}
            <div className="rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">賞析文字（前台顯示）</h3>
              <textarea
                value={appreciation}
                onChange={(e) => setAppreciation(e.target.value)}
                className="w-full bg-[#111] text-gray-200 text-sm rounded p-2 border border-[#2e2e2e] resize-none focus:outline-none focus:border-amber-500"
                rows={4}
                placeholder="分享這張照片的故事、構圖理念…"
              />
            </div>

            {/* Show Public Toggle */}
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showPublic}
                  onChange={(e) => setShowPublic(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${showPublic ? 'bg-amber-500' : 'bg-gray-700'}`} />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showPublic ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-300">顯示於前台</span>
            </label>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
