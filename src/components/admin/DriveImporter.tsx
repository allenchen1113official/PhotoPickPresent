'use client'
import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import type { DriveFile } from '@/types'

interface DriveFileWithStatus extends DriveFile { imported: boolean }

interface DriveImporterProps {
  onImported: () => void
}

export default function DriveImporter({ onImported }: DriveImporterProps) {
  const { data: session } = useSession()
  const [folders, setFolders] = useState<DriveFile[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [files, setFiles] = useState<DriveFileWithStatus[]>([])
  const [nextPageToken, setNextPageToken] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<Set<string>>(new Set())
  const [importingAll, setImportingAll] = useState(false)

  useEffect(() => {
    if (session?.accessToken) loadFolders()
  }, [session])

  async function loadFolders() {
    const res = await fetch('/api/drive/folders')
    if (res.ok) {
      const data = await res.json()
      setFolders(data.folders || [])
    }
  }

  async function loadFiles(folderId?: string, pageToken?: string) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (folderId) params.set('folderId', folderId)
      if (pageToken) params.set('pageToken', pageToken)
      const res = await fetch(`/api/drive/files?${params}`)
      const data = await res.json()
      if (pageToken) setFiles((prev) => [...prev, ...(data.files || [])])
      else setFiles(data.files || [])
      setNextPageToken(data.nextPageToken || '')
    } finally {
      setLoading(false)
    }
  }

  async function importFile(file: DriveFileWithStatus) {
    setImporting((prev) => new Set(prev).add(file.id))
    try {
      // Get EXIF from thumbnail
      let exif = {}
      try {
        const exifr = await import('exifr')
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`
        const parsed = await exifr.default.parse(thumbnailUrl).catch(() => null)
        if (parsed) {
          exif = {
            taken_at: parsed.DateTimeOriginal
              ? new Date(parsed.DateTimeOriginal).toISOString()
              : parsed.CreateDate
              ? new Date(parsed.CreateDate).toISOString()
              : null,
            camera_make: parsed.Make || null,
            camera_model: parsed.Model || null,
            lens_model: parsed.LensModel || null,
            aperture: parsed.FNumber || null,
            shutter_speed: parsed.ExposureTime
              ? parsed.ExposureTime >= 1
                ? `${parsed.ExposureTime}s`
                : `1/${Math.round(1 / parsed.ExposureTime)}s`
              : null,
            iso: parsed.ISO || null,
            focal_length: parsed.FocalLength || null,
            width: parsed.ExifImageWidth || parsed.ImageWidth || null,
            height: parsed.ExifImageHeight || parsed.ImageHeight || null,
          }
        }
      } catch {}

      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_type: 'google',
          drive_id: file.id,
          filename: file.name,
          thumbnail_url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
          full_url: `https://drive.google.com/uc?export=view&id=${file.id}`,
          exif,
        }),
      })
      if (res.ok || res.status === 409) {
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, imported: true } : f)))
        onImported()
      }
    } finally {
      setImporting((prev) => { const s = new Set(prev); s.delete(file.id); return s })
    }
  }

  async function importAll() {
    setImportingAll(true)
    for (const f of files.filter((f) => !f.imported)) {
      await importFile(f)
    }
    setImportingAll(false)
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">請先登入 Google 帳號以連結 Google Drive</p>
        <button
          onClick={() => signIn('google')}
          className="px-6 py-2.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          使用 Google 帳號登入
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Folder Selector */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-gray-400 mb-1">選擇資料夾（留空顯示全部）</label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full bg-[#242424] border border-[#2e2e2e] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="">— 全部照片 —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => loadFiles(selectedFolder || undefined)}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '載入中…' : '瀏覽照片'}
        </button>
      </div>

      {/* File Grid */}
      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">共 {files.length} 張，{files.filter(f => f.imported).length} 張已匯入</span>
            <button
              onClick={importAll}
              disabled={importingAll || files.every((f) => f.imported)}
              className="px-3 py-1.5 bg-[#242424] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-gray-200 text-xs rounded-lg transition-colors disabled:opacity-40"
            >
              {importingAll ? '匯入中…' : '全部匯入'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {files.map((file) => (
              <div key={file.id} className="relative group rounded-lg overflow-hidden bg-[#242424] aspect-square">
                <img
                  src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w200`}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {file.imported ? (
                    <span className="text-green-400 text-xs font-medium bg-black/50 px-2 py-1 rounded">✓ 已匯入</span>
                  ) : (
                    <button
                      onClick={() => importFile(file)}
                      disabled={importing.has(file.id)}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      {importing.has(file.id) ? '匯入…' : '匯入'}
                    </button>
                  )}
                </div>
                {file.imported && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                  <p className="text-white text-xs truncate">{file.name}</p>
                </div>
              </div>
            ))}
          </div>

          {nextPageToken && (
            <button
              onClick={() => loadFiles(selectedFolder || undefined, nextPageToken)}
              disabled={loading}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-200 border border-[#2e2e2e] rounded-lg transition-colors"
            >
              載入更多
            </button>
          )}
        </>
      )}
    </div>
  )
}
