'use client'
import { useState, useEffect } from 'react'
import type { Photo } from '@/types'

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_MODE === 'true'

interface PhotoCardProps {
  photo: Photo
  onClick: () => void
}

export default function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const [likes, setLikes] = useState(photo.likes)
  const [liked, setLiked] = useState(false)
  const [likePending, setLikePending] = useState(false)

  useEffect(() => {
    if (IS_STATIC) return  // 靜態模式不呼叫 API
    fetch(`/api/likes/${photo.id}`).then(r => r.json()).then(d => setLiked(d.liked))
  }, [photo.id])

  async function toggleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (IS_STATIC || likePending) return  // 靜態模式：僅顯示讚數，不可互動
    setLikePending(true)
    try {
      const res = await fetch(`/api/likes/${photo.id}`, { method: 'POST' })
      const data = await res.json()
      setLikes(data.likes)
      setLiked(data.liked)
    } finally {
      setLikePending(false)
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/gallery?photo=${photo.id}`
    if (navigator.share) {
      await navigator.share({ title: photo.filename, url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('連結已複製！')
    }
  }

  const takenAt = photo.taken_at
    ? new Date(photo.taken_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="photo-card group rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#2e2e2e] cursor-pointer" onClick={onClick}>
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {photo.thumbnail_url ? (
          <img
            src={photo.thumbnail_url}
            alt={photo.filename}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#242424] flex items-center justify-center text-gray-600">
            <span className="text-3xl">📷</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Camera params badge */}
        {(photo.aperture || photo.shutter_speed || photo.iso) && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            {photo.aperture && <span>f/{photo.aperture.toFixed(1)}</span>}
            {photo.shutter_speed && <span>{photo.shutter_speed}</span>}
            {photo.iso && <span>ISO {photo.iso}</span>}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{photo.filename.replace(/\.[^.]+$/, '')}</p>
            {takenAt && <p className="text-gray-500 text-xs mt-0.5">{takenAt}</p>}
            {(photo.camera_make || photo.camera_model) && (
              <p className="text-gray-500 text-xs truncate">
                {[photo.camera_make, photo.camera_model].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
        </div>

        {/* Appreciation preview */}
        {photo.appreciation && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{photo.appreciation}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={toggleLike}
            disabled={likePending}
            className={`flex items-center gap-1.5 text-sm transition-all ${
              liked ? 'text-red-400 scale-110' : 'text-gray-500 hover:text-red-400'
            }`}
          >
            <span className={`text-base transition-transform ${liked ? 'scale-125' : ''}`}>
              {liked ? '❤️' : '🤍'}
            </span>
            <span>{likes}</span>
          </button>

          <button
            onClick={handleShare}
            className="text-gray-500 hover:text-amber-400 transition-colors text-sm flex items-center gap-1"
          >
            <span>🔗</span>
            <span className="text-xs">分享</span>
          </button>
        </div>
      </div>
    </div>
  )
}
