'use client'
import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import type { DriveFile } from '@/types'
import type { OneDriveFileRaw } from '@/lib/onedrive'

type CloudProvider = 'google' | 'onedrive'
interface FileWithStatus extends DriveFile {
  imported: boolean
  oneDrivePhoto?: OneDriveFileRaw['photo']
  imageWidth?: number
  imageHeight?: number
}

interface DriveImporterProps {
  onImported: () => void
}

export default function DriveImporter({ onImported }: DriveImporterProps) {
  const { data: session } = useSession()
  const [provider, setProvider] = useState<CloudProvider>('google')
  const [folders, setFolders] = useState<DriveFile[]>([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [nextPageToken, setNextPageToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<Set<string>>(new Set())
  const [importingAll, setImportingAll] = useState(false)
  const [error, setError] = useState('')

  const hasGoogle = !!session?.googleAccessToken
  const hasMicrosoft = !!session?.microsoftAccessToken
  const isConnected = provider === 'google' ? hasGoogle : hasMicrosoft

  useEffect(() => {
    setFiles([])
    setFolders([])
    setSelectedFolder('')
    setNextPageToken('')
  }, [provider])

  useEffect(() => {
    if (isConnected) loadFolders()
  }, [provider, hasGoogle, hasMicrosoft])

  async function loadFolders() {
    setError('')
    const endpoint = provider === 'google' ? '/api/drive/folders' : '/api/onedrive/folders'
    const res = await fetch(endpoint)
    const data = await res.json()
    if (res.ok) {
      setFolders(data.folders || [])
    } else {
      setError(data.error || `載入資料夾失敗（HTTP ${res.status}）`)
    }
  }

  async function loadFiles(folderId?: string, pageToken?: string) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (folderId) params.set('folderId', folderId)
      if (pageToken) params.set(provider === 'google' ? 'pageToken' : 'nextLink', pageToken)
      const endpoint = provider === 'google' ? '/api/drive/files' : '/api/onedrive/files'
      const res = await fetch(`${endpoint}?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `載入失敗（HTTP ${res.status}）`)
        return
      }
      const newFiles: FileWithStatus[] = (data.files || []).map((f: any) => ({
        ...f,
        imported: f.imported ?? false,
        oneDrivePhoto: f.photo,
        imageWidth: f.imageWidth,
        imageHeight: f.imageHeight,
      }))
      if (pageToken) setFiles(prev => [...prev, ...newFiles])
      else setFiles(newFiles)
      setNextPageToken(data.nextPageToken || data.nextLink || '')
    } catch (e: any) {
      setError(e.message || '網路錯誤')
    } finally {
      setLoading(false)
    }
  }

  function getThumbnailSrc(file: FileWithStatus): string {
    if (provider === 'google') return `https://drive.google.com/thumbnail?id=${file.id}&sz=w200`
    return file.thumbnailLink || ''
  }

  async function importFile(file: FileWithStatus) {
    setImporting(prev => new Set(prev).add(file.id))
    try {
      let exif: Record<string, unknown> = {}
      if (provider === 'google') {
        try {
          const exifr = await import('exifr')
          const parsed = await exifr.default
            .parse(`https://drive.google.com/thumbnail?id=${file.id}&sz=w800`)
            .catch(() => null)
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
      } else {
        const p = file.oneDrivePhoto
        if (p) {
          const shutterSpeed =
            p.exposureNumerator && p.exposureDenominator
              ? p.exposureNumerator / p.exposureDenominator >= 1
                ? `${p.exposureNumerator / p.exposureDenominator}s`
                : `1/${Math.round(p.exposureDenominator / p.exposureNumerator)}s`
              : null
          exif = {
            taken_at: p.takenDateTime ?? null,
            camera_make: p.cameraMake ?? null,
            camera_model: p.cameraModel ?? null,
            lens_model: null,
            aperture: p.fNumber ?? null,
            shutter_speed: shutterSpeed,
            iso: p.iso ?? null,
            focal_length: p.focalLength ?? null,
            width: file.imageWidth ?? null,
            height: file.imageHeight ?? null,
          }
        }
      }

      const isGoogle = provider === 'google'
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_type: isGoogle ? 'google' : 'onedrive',
          drive_id: file.id,
          filename: file.name,
          thumbnail_url: isGoogle
            ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`
            : (file.thumbnailLink ?? null),
          full_url: isGoogle
            ? `https://drive.google.com/uc?export=view&id=${file.id}`
            : (file.webContentLink ?? null),
          exif,
        }),
      })
      if (res.ok || res.status === 409) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, imported: true } : f))
        onImported()
      }
    } finally {
      setImporting(prev => { const s = new Set(prev); s.delete(file.id); return s })
    }
  }

  async function importAll() {
    setImportingAll(true)
    for (const f of files.filter(f => !f.imported)) await importFile(f)
    setImportingAll(false)
  }

  return (
    <div className="space-y-4">
      {/* Provider Selector */}
      <div className="flex gap-2">
        {(['google', 'onedrive'] as const).map(p => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              provider === p
                ? 'bg-amber-500 text-black'
                : 'bg-[#242424] text-gray-400 hover:text-gray-200 border border-[#3a3a3a]'
            }`}
          >
            {p === 'google' ? (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill={provider === p ? '#000' : '#4285F4'} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill={provider === p ? '#000' : '#34A853'} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill={provider === p ? '#000' : '#FBBC05'} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill={provider === p ? '#000' : '#EA4335'} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Drive
                {hasGoogle && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill={provider === p ? '#000' : '#0078D4'}>
                  <path d="M11.55 3.04A8.22 8.22 0 0 1 19.78 9.5a5.99 5.99 0 0 1 4.22 5.75A6 6 0 0 1 18 21H6a6 6 0 0 1-.33-11.97 8.22 8.22 0 0 1 5.88-5.99z"/>
                </svg>
                OneDrive
                {hasMicrosoft && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Not signed in at all */}
      {!session && (
        <div className="text-center py-8 space-y-4">
          <p className="text-gray-400">請先登入以連結雲端儲存空間</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => signIn('google')} className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google 登入
            </button>
            <button onClick={() => signIn('azure-ad')} className="px-5 py-2.5 bg-[#0078D4] text-white rounded-lg font-medium hover:bg-[#106EBE] transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white"><path d="M11.55 3.04A8.22 8.22 0 0 1 19.78 9.5a5.99 5.99 0 0 1 4.22 5.75A6 6 0 0 1 18 21H6a6 6 0 0 1-.33-11.97 8.22 8.22 0 0 1 5.88-5.99z"/></svg>
              Microsoft 登入
            </button>
          </div>
        </div>
      )}

      {/* Google not connected */}
      {session && provider === 'google' && !hasGoogle && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">請使用 Google 帳號登入以連結 Google Drive</p>
          <button onClick={() => signIn('google')} className="px-6 py-2.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            使用 Google 帳號登入
          </button>
        </div>
      )}

      {/* OneDrive not connected */}
      {session && provider === 'onedrive' && !hasMicrosoft && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-2">尚未連結 OneDrive</p>
          <p className="text-gray-600 text-xs mb-4">使用 Microsoft 帳號授權後即可瀏覽 OneDrive 照片</p>
          <button onClick={() => signIn('azure-ad')} className="px-6 py-2.5 bg-[#0078D4] text-white rounded-lg font-medium hover:bg-[#106EBE] transition-colors flex items-center gap-2 mx-auto">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M11.55 3.04A8.22 8.22 0 0 1 19.78 9.5a5.99 5.99 0 0 1 4.22 5.75A6 6 0 0 1 18 21H6a6 6 0 0 1-.33-11.97 8.22 8.22 0 0 1 5.88-5.99z"/></svg>
            連結 Microsoft / OneDrive
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 space-y-2">
          <p className="font-medium">載入失敗</p>
          <p className="text-xs text-red-300/80 break-all">{error}</p>
          {error.includes('Insufficient Permission') || error.includes('insufficient') ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-300">
                目前的 Google 登入缺少 Drive 存取權限。請重新授權：
              </p>
              <button
                onClick={async () => {
                  await signOut({ redirect: false })
                  signIn('google')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                重新授權 Google Drive
              </button>
            </div>
          ) : (error.includes('403') || error.toLowerCase().includes('drive api')) ? (
            <p className="text-xs text-gray-400">
              請至 Google Cloud Console → APIs & Services → Library，搜尋並啟用 <strong>Google Drive API</strong>。
            </p>
          ) : null}
        </div>
      )}

      {/* Main file browser (connected) */}
      {isConnected && (
        <>
          {provider === 'onedrive' && (
            <div className="text-xs text-amber-600/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              ⚠️ OneDrive 縮圖連結有有效期限（數小時），若公開相簿圖片失效請重新匯入以更新 URL。建議公開相簿使用 Google Drive。
            </div>
          )}

          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-400 mb-1">選擇資料夾（留空顯示全部）</label>
              <select
                value={selectedFolder}
                onChange={e => setSelectedFolder(e.target.value)}
                className="w-full bg-[#242424] border border-[#2e2e2e] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="">— 全部照片 —</option>
                {folders.map(f => (
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

          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  共 {files.length} 張，{files.filter(f => f.imported).length} 張已匯入
                </span>
                <button
                  onClick={importAll}
                  disabled={importingAll || files.every(f => f.imported)}
                  className="px-3 py-1.5 bg-[#242424] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-gray-200 text-xs rounded-lg transition-colors disabled:opacity-40"
                >
                  {importingAll ? '匯入中…' : '全部匯入'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {files.map(file => (
                  <div key={file.id} className="relative group rounded-lg overflow-hidden bg-[#242424] aspect-square">
                    {getThumbnailSrc(file) ? (
                      <img src={getThumbnailSrc(file)} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">無預覽</div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
        </>
      )}
    </div>
  )
}
