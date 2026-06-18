'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Photo } from '@/types'

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_MODE === 'true'

interface PhotoLightboxProps {
  photo: Photo
  photos: Photo[]
  onClose: () => void
  onNavigate: (photo: Photo) => void
}

export default function PhotoLightbox({ photo, photos, onClose, onNavigate }: PhotoLightboxProps) {
  const [likes, setLikes] = useState(photo.likes)
  const [liked, setLiked] = useState(false)
  const [likePending, setLikePending] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const currentIndex = photos.findIndex((p) => p.id === photo.id)

  useEffect(() => {
    setLikes(photo.likes)
    if (IS_STATIC) return
    fetch(`/api/likes/${photo.id}`).then(r => r.json()).then(d => setLiked(d.liked))
  }, [photo.id, photo.likes])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(photos[currentIndex - 1])
  }, [currentIndex, photos, onNavigate])

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) onNavigate(photos[currentIndex + 1])
  }, [currentIndex, photos, onNavigate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') onClose()
      if (e.key === 'ArrowLeft' || e.key === 'f' || e.key === 'F' || e.key === 'ArrowUp') handlePrev()
      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N' || e.key === 'ArrowDown') handleNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, handlePrev, handleNext])

  async function toggleLike() {
    if (IS_STATIC || likePending) return
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

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/gallery?photo=${photo.id}`

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareToFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')
  }

  function shareToLine() {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')
  }

  function shareToThreads() {
    const text = `${photo.filename}\n${shareUrl}`
    window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  async function shareToInstagram() {
    // Instagram 不支援以連結預填貼文，因此先複製連結，再開啟 Instagram 供使用者貼上。
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
  }

  function handleShare() {
    setShowShareMenu((v) => !v)
  }

  const takenAt = photo.taken_at
    ? new Date(photo.taken_at).toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col sm:flex-row" onClick={onClose}>
      {/* Image area */}
      <div className={`flex-1 min-h-0 flex items-center justify-center relative min-w-0 ${showInfo ? 'max-h-[55vh] sm:max-h-none' : ''}`} onClick={onClose}>
        {/* Prev */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev() }}
            className="absolute left-2 sm:left-4 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >‹</button>
        )}

        <img
          src={photo.full_url || photo.thumbnail_url || ''}
          alt={photo.filename}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNext() }}
            className="absolute right-2 sm:right-4 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >›</button>
        )}

        {/* Counter + keyboard hints */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {currentIndex + 1} / {photos.length}
          </div>
          <div className="hidden sm:flex bg-black/40 text-gray-400 text-[10px] px-3 py-1 rounded-full gap-2">
            <span>F / ↑ 上一張</span>
            <span>·</span>
            <span>N / ↓ 下一張</span>
            <span>·</span>
            <span>M 回相簿</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div
          className="w-full sm:w-[360px] max-h-[45vh] sm:max-h-none flex-shrink-0 bg-[#111] border-t sm:border-t-0 sm:border-l border-[#2a2a2a] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            <button onClick={() => setShowInfo(false)} className="text-gray-500 hover:text-gray-300 text-xs">隱藏資訊</button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Title */}
            <div>
              <h2 className="text-white font-medium text-base">{photo.filename.replace(/\.[^.]+$/, '')}</h2>
              {takenAt && <p className="text-gray-500 text-sm mt-0.5">{takenAt}</p>}
            </div>

            {/* Camera info */}
            {(photo.camera_make || photo.camera_model) && (
              <div className="rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] p-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">相機</h3>
                <p className="text-gray-200 text-sm">
                  {[photo.camera_make, photo.camera_model].filter(Boolean).join(' ')}
                </p>
                {photo.lens_model && <p className="text-gray-400 text-xs mt-1">{photo.lens_model}</p>}
              </div>
            )}

            {/* Shooting params */}
            {(photo.aperture || photo.shutter_speed || photo.iso || photo.focal_length) && (
              <div className="rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] p-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">拍攝參數</h3>
                <div className="grid grid-cols-2 gap-3">
                  {photo.aperture && (
                    <div className="text-center bg-[#0f0f0f] rounded-lg py-2 px-1">
                      <div className="text-amber-400 font-mono font-bold text-lg">f/{photo.aperture.toFixed(1)}</div>
                      <div className="text-gray-500 text-xs mt-0.5">光圈</div>
                    </div>
                  )}
                  {photo.shutter_speed && (
                    <div className="text-center bg-[#0f0f0f] rounded-lg py-2 px-1">
                      <div className="text-amber-400 font-mono font-bold text-lg">{photo.shutter_speed}</div>
                      <div className="text-gray-500 text-xs mt-0.5">快門</div>
                    </div>
                  )}
                  {photo.iso && (
                    <div className="text-center bg-[#0f0f0f] rounded-lg py-2 px-1">
                      <div className="text-amber-400 font-mono font-bold text-lg">{photo.iso}</div>
                      <div className="text-gray-500 text-xs mt-0.5">ISO</div>
                    </div>
                  )}
                  {photo.focal_length && (
                    <div className="text-center bg-[#0f0f0f] rounded-lg py-2 px-1">
                      <div className="text-amber-400 font-mono font-bold text-lg">{photo.focal_length}mm</div>
                      <div className="text-gray-500 text-xs mt-0.5">焦距</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appreciation */}
            {photo.appreciation && (
              <div className="rounded-lg bg-[#1a1a1a] border border-[#2e2e2e] p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">賞析</h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{photo.appreciation}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-[#2a2a2a] flex gap-3">
            <button
              onClick={toggleLike}
              disabled={likePending}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                liked
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-[#1a1a1a] border border-[#2e2e2e] text-gray-400 hover:border-red-500/40 hover:text-red-400'
              }`}
            >
              <span className="text-base">{liked ? '❤️' : '🤍'}</span>
              <span>{likes} 讚</span>
            </button>
            <div className="relative flex-1">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-amber-500/40 hover:text-amber-400 text-gray-400 rounded-xl font-medium text-sm transition-all"
              >
                <span>🔗</span>
                <span>分享</span>
              </button>

              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute z-20 bottom-full mb-2 right-0 w-48 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl shadow-2xl p-2 space-y-1">
                    <button
                      onClick={() => { shareToFacebook(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="text-base">📘</span>
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => { shareToInstagram(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="text-base">📸</span>
                      <span>Instagram</span>
                    </button>
                    <button
                      onClick={() => { shareToLine(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="text-base">💬</span>
                      <span>LINE</span>
                    </button>
                    <button
                      onClick={() => { shareToThreads(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="text-base">🧵</span>
                      <span>Threads</span>
                    </button>
                    <div className="border-t border-[#2e2e2e] my-1" />
                    <button
                      onClick={() => { copyShareLink(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-[#2a2a2a] transition-colors"
                    >
                      <span className="text-base">🔗</span>
                      <span>複製連結</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-green-500/90 text-black text-sm font-medium px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-30">
          <span>✓</span>
          <span>連結已複製</span>
        </div>
      )}

      {/* Show info button (when hidden) */}
      {!showInfo && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowInfo(true) }}
          className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/80 transition-colors"
        >
          顯示資訊
        </button>
      )}
    </div>
  )
}
