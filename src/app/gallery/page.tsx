'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PhotoCard from '@/components/gallery/PhotoCard'
import PhotoLightbox from '@/components/gallery/PhotoLightbox'
import type { Photo } from '@/types'

// GitHub Pages 靜態模式：從 photos.json 讀取資料，不呼叫 API
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_MODE === 'true'
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

const SORT_FN: Record<string, (a: Photo, b: Photo) => number> = {
  taken_at_desc: (a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''),
  taken_at_asc:  (a, b) => (a.taken_at || '').localeCompare(b.taken_at || ''),
  likes_desc:    (a, b) => b.likes - a.likes,
}

export default function GalleryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [allPhotos, setAllPhotos] = useState<Photo[]>([])   // 靜態模式：全部照片
  const [photos, setPhotos] = useState<Photo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [sort, setSort] = useState('taken_at_desc')
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const LIMIT = 24

  // ── 靜態模式：初次載入所有照片 ──────────────────────────
  useEffect(() => {
    if (!IS_STATIC) return
    setLoading(true)
    fetch(`${BASE_PATH}/photos.json`)
      .then(r => r.json())
      .then((data: Photo[]) => {
        setAllPhotos(data)
      })
      .catch(() => setAllPhotos([]))
      .finally(() => setLoading(false))
  }, [])

  // 靜態模式：排序 + 分頁
  useEffect(() => {
    if (!IS_STATIC) return
    const sorted = [...allPhotos].sort(SORT_FN[sort] || SORT_FN.taken_at_desc)
    setTotal(sorted.length)
    setPhotos(sorted.slice(0, page * LIMIT))
  }, [allPhotos, sort, page])

  // ── 動態模式（本機 / Vercel）：呼叫 API ─────────────────
  const fetchPhotos = useCallback(async (p = 1) => {
    if (IS_STATIC) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort })
      const res = await fetch(`/api/photos?${params}`)
      const data = await res.json()
      if (p === 1) setPhotos(data.photos)
      else setPhotos((prev) => [...prev, ...data.photos])
      setTotal(data.total)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => {
    if (!IS_STATIC) { setPage(1); fetchPhotos(1) }
  }, [sort])

  // 從 URL 開啟燈箱（?photo=ID）
  useEffect(() => {
    const photoId = searchParams.get('photo')
    if (photoId && photos.length > 0) {
      const found = photos.find((p) => p.id === parseInt(photoId))
      if (found) setLightboxPhoto(found)
    }
  }, [searchParams, photos])

  // 無限捲動（動態模式）/ 載入更多（靜態模式）
  useEffect(() => {
    if (IS_STATIC) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && photos.length < total) {
          fetchPhotos(page + 1)
        }
      },
      { threshold: 0.1 }
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loading, photos.length, total, page, fetchPhotos])

  function openLightbox(photo: Photo) {
    setLightboxPhoto(photo)
    router.push(`${BASE_PATH}/gallery?photo=${photo.id}`, { scroll: false })
  }
  function closeLightbox() {
    setLightboxPhoto(null)
    router.push(`${BASE_PATH}/gallery`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/90 backdrop-blur border-b border-[#2e2e2e]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-2xl">📷</span>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">攝影作品集</h1>
              <p className="text-gray-500 text-xs">Photography Gallery</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="bg-[#1a1a1a] border border-[#2e2e2e] text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="taken_at_desc">最新拍攝</option>
              <option value="taken_at_asc">最早拍攝</option>
              <option value="likes_desc">最多讚</option>
            </select>
            <span className="text-gray-600 text-sm">{total} 張</span>
            <a
              href={`${BASE_PATH}/admin`}
              className="text-gray-700 hover:text-gray-400 text-xs transition-colors"
              title="後台管理"
            >
              ⚙
            </a>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && photos.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[#1a1a1a] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[#242424]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-[#242424] rounded w-3/4" />
                  <div className="h-3 bg-[#242424] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : photos.length === 0 && !loading ? (
          <div className="text-center py-32 text-gray-600">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-lg">目前沒有公開的作品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onClick={() => openLightbox(photo)} />
            ))}
          </div>
        )}

        {/* 載入更多 / 無限捲動 觸發點 */}
        <div ref={loadMoreRef} className="h-16 mt-4 flex items-center justify-center">
          {loading && photos.length > 0 && (
            <div className="text-gray-600 text-sm animate-pulse">載入中…</div>
          )}
          {IS_STATIC && !loading && photos.length < total && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-6 py-2 border border-[#2e2e2e] text-gray-400 hover:text-gray-200 rounded-lg text-sm transition-colors"
            >
              載入更多（{photos.length}/{total}）
            </button>
          )}
          {!loading && photos.length > 0 && photos.length >= total && (
            <div className="text-gray-700 text-sm">— 已顯示全部 {total} 張 —</div>
          )}
        </div>
      </main>

      {/* Lightbox */}
      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          photos={photos}
          onClose={closeLightbox}
          onNavigate={(p) => {
            setLightboxPhoto(p)
            router.push(`${BASE_PATH}/gallery?photo=${p.id}`, { scroll: false })
          }}
        />
      )}
    </div>
  )
}
