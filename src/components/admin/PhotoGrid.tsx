'use client'
import { useState, useEffect, useCallback } from 'react'
import StarRating from './StarRating'
import PhotoEditor from './PhotoEditor'
import type { Photo } from '@/types'

interface PhotoGridProps {
  refreshKey?: number
}

export default function PhotoGrid({ refreshKey }: PhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Photo | null>(null)
  const [filterRating, setFilterRating] = useState(0)
  const [sort, setSort] = useState('taken_at_desc')

  const fetchPhotos = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ admin: '1', page: String(p), limit: '20', sort })
      if (filterRating > 0) params.set('rating', String(filterRating))
      const res = await fetch(`/api/photos?${params}`)
      const data = await res.json()
      if (p === 1) setPhotos(data.photos)
      else setPhotos((prev) => [...prev, ...data.photos])
      setTotal(data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [filterRating, sort])

  useEffect(() => { fetchPhotos(1) }, [fetchPhotos, refreshKey])

  const handleUpdate = useCallback((updated: Photo) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('確定刪除此筆記錄？')) return
    await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    setTotal((t) => t - 1)
  }, [])

  const STAR_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-400 mr-1">篩選：</span>
          <button
            onClick={() => { setFilterRating(0) }}
            className={`px-2 py-1 text-xs rounded transition-colors ${filterRating === 0 ? 'bg-amber-500 text-black' : 'bg-[#242424] text-gray-400 hover:bg-[#2e2e2e]'}`}
          >全部</button>
          {[1,2,3,4,5].map(r => (
            <button
              key={r}
              onClick={() => setFilterRating(r)}
              className={`px-2 py-1 text-xs rounded transition-colors ${filterRating === r ? 'bg-amber-500 text-black' : 'bg-[#242424] text-gray-400 hover:bg-[#2e2e2e]'}`}
              style={filterRating === r ? {} : { color: STAR_COLORS[r] }}
            >{'★'.repeat(r)}</button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-[#242424] border border-[#2e2e2e] text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500"
        >
          <option value="taken_at_desc">拍攝時間（新→舊）</option>
          <option value="taken_at_asc">拍攝時間（舊→新）</option>
          <option value="rating_desc">評分（高→低）</option>
          <option value="likes_desc">按讚數</option>
          <option value="created_desc">匯入時間</option>
        </select>
        <span className="text-xs text-gray-500 ml-auto">共 {total} 張</span>
      </div>

      {/* Grid */}
      {loading && photos.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[#242424] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">📷</div>
          <p>尚未匯入任何照片</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="photo-card relative group rounded-lg overflow-hidden bg-[#242424] cursor-pointer"
              style={{ aspectRatio: '1' }}
              onClick={() => setSelected(photo)}
            >
              {photo.thumbnail_url ? (
                <img src={photo.thumbnail_url} alt={photo.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">無預覽</div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-white text-xs truncate mb-1">{photo.filename}</p>
                {photo.rating > 0 && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: photo.rating }).map((_, i) => (
                      <span key={i} className="text-xs" style={{ color: STAR_COLORS[photo.rating] }}>★</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                {photo.show_public === 1 && (
                  <span className="bg-amber-500/90 text-black text-xs px-1.5 py-0.5 rounded font-medium">公開</span>
                )}
                {photo.rating === 0 && (
                  <span className="bg-gray-700/80 text-gray-300 text-xs px-1.5 py-0.5 rounded">未評</span>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(photo.id) }}
                className="absolute top-1.5 left-1.5 w-6 h-6 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {photos.length < total && (
        <button
          onClick={() => fetchPhotos(page + 1)}
          disabled={loading}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-200 border border-[#2e2e2e] rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '載入中…' : `載入更多（${photos.length}/${total}）`}
        </button>
      )}

      {/* Photo Editor Modal */}
      {selected && (() => {
        const idx = photos.findIndex(p => p.id === selected.id)
        return (
          <PhotoEditor
            photo={selected}
            onUpdate={(updated) => { handleUpdate(updated); setSelected(updated) }}
            onClose={() => setSelected(null)}
            onPrev={idx > 0 ? () => setSelected(photos[idx - 1]) : undefined}
            onNext={idx < photos.length - 1 ? () => setSelected(photos[idx + 1]) : undefined}
          />
        )
      })()}
    </div>
  )
}
