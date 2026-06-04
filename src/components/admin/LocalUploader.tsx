'use client'
import { useState, useRef, useCallback } from 'react'

interface LocalFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

async function extractExif(file: File): Promise<Record<string, unknown>> {
  try {
    const exifr = await import('exifr')
    const parsed = await exifr.default.parse(file).catch(() => null)
    if (!parsed) return {}
    return {
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
  } catch {
    return {}
  }
}

function openFilePicker(opts: { capture?: string; multiple?: boolean; onChange: (files: FileList) => void }) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  if (opts.capture) input.setAttribute('capture', opts.capture)
  if (opts.multiple) input.multiple = true
  input.onchange = () => { if (input.files?.length) opts.onChange(input.files) }
  input.click()
}

export default function LocalUploader({ onImported }: { onImported: () => void }) {
  const [files, setFiles] = useState<LocalFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploadingAll, setUploadingAll] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  function addRawFiles(rawFiles: FileList | File[]) {
    const items: LocalFile[] = Array.from(rawFiles)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        preview: URL.createObjectURL(f),
        status: 'pending' as const,
      }))
    setFiles(prev => [...prev, ...items])
  }

  function removeFile(id: string) {
    setFiles(prev => {
      const f = prev.find(x => x.id === id)
      if (f) URL.revokeObjectURL(f.preview)
      return prev.filter(x => x.id !== id)
    })
  }

  async function uploadOne(localFile: LocalFile) {
    setFiles(prev => prev.map(f => f.id === localFile.id ? { ...f, status: 'uploading', error: undefined } : f))
    try {
      const exif = await extractExif(localFile.file)
      const formData = new FormData()
      formData.append('file', localFile.file)
      formData.append('exif', JSON.stringify(exif))
      const res = await fetch('/api/photos/upload', { method: 'POST', body: formData })
      if (res.ok || res.status === 409) {
        setFiles(prev => prev.map(f => f.id === localFile.id ? { ...f, status: 'done' } : f))
        onImported()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
    } catch (e: any) {
      setFiles(prev => prev.map(f => f.id === localFile.id ? { ...f, status: 'error', error: e.message } : f))
    }
  }

  async function uploadAll() {
    setUploadingAll(true)
    for (const f of files.filter(f => f.status === 'pending')) {
      await uploadOne(f)
    }
    setUploadingAll(false)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addRawFiles(e.dataTransfer.files)
  }, [])

  const pendingCount = files.filter(f => f.status === 'pending').length
  const doneCount = files.filter(f => f.status === 'done').length

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={e => { if (!dropRef.current?.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={onDrop}
        onClick={() => openFilePicker({ multiple: true, onChange: addRawFiles })}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-[#3a3a3a] hover:border-[#555] hover:bg-[#1a1a1a]'
        }`}
      >
        <div className="text-5xl mb-3 pointer-events-none">📂</div>
        <p className="text-gray-300 font-medium mb-1 pointer-events-none">拖曳照片到這裡</p>
        <p className="text-gray-500 text-sm mb-4 pointer-events-none">或點此選擇檔案（支援多選）</p>
        <div className="flex gap-2 justify-center pointer-events-none">
          {['JPG', 'PNG', 'HEIC', 'WebP', 'RAW'].map(ext => (
            <span key={ext} className="text-xs text-gray-600 bg-[#111] px-2 py-1 rounded">{ext}</span>
          ))}
        </div>
      </div>

      {/* Mobile-friendly buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => openFilePicker({ capture: 'environment', multiple: true, onChange: addRawFiles })}
          className="flex items-center gap-2 px-4 py-2 bg-[#242424] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-gray-300 text-sm rounded-lg transition-colors"
        >
          📷 拍照上傳
        </button>
        <button
          onClick={() => openFilePicker({ multiple: true, onChange: addRawFiles })}
          className="flex items-center gap-2 px-4 py-2 bg-[#242424] hover:bg-[#2e2e2e] border border-[#3a3a3a] text-gray-300 text-sm rounded-lg transition-colors"
        >
          🖼️ 從相簿選取
        </button>
      </div>

      {/* File grid */}
      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-gray-400">
              共 {files.length} 張
              {doneCount > 0 && <span className="text-green-400 ml-1">· {doneCount} 已上傳</span>}
              {pendingCount > 0 && <span className="text-gray-500 ml-1">· {pendingCount} 待上傳</span>}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  files.forEach(f => URL.revokeObjectURL(f.preview))
                  setFiles([])
                }}
                className="text-xs text-gray-600 hover:text-gray-400 px-3 py-1.5 rounded-lg border border-[#2e2e2e] transition-colors"
              >
                清除全部
              </button>
              <button
                onClick={uploadAll}
                disabled={uploadingAll || pendingCount === 0}
                className="text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                {uploadingAll ? '上傳中…' : `全部上傳 (${pendingCount})`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {files.map(f => (
              <div key={f.id} className="relative group rounded-lg overflow-hidden bg-[#242424] aspect-square">
                <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />

                {/* Hover / status overlay */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                  f.status === 'pending'   ? 'bg-black/60 opacity-0 group-hover:opacity-100' :
                  f.status === 'uploading' ? 'bg-black/50 opacity-100' :
                  f.status === 'error'     ? 'bg-black/70 opacity-100' :
                  'opacity-0'
                }`}>
                  {f.status === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); uploadOne(f) }}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded transition-colors"
                    >
                      上傳
                    </button>
                  )}
                  {f.status === 'uploading' && (
                    <div className="text-white text-xs font-medium animate-pulse">上傳中…</div>
                  )}
                  {f.status === 'error' && (
                    <div className="text-center px-2 space-y-1">
                      <div className="text-red-400 text-xs leading-tight">{f.error ?? '上傳失敗'}</div>
                      <button
                        onClick={e => { e.stopPropagation(); uploadOne({ ...f, status: 'pending' }) }}
                        className="text-xs bg-red-500/30 hover:bg-red-500/50 text-red-300 px-2 py-1 rounded transition-colors"
                      >
                        重試
                      </button>
                    </div>
                  )}
                </div>

                {/* Done badge */}
                {f.status === 'done' && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                )}

                {/* Remove button (pending only) */}
                {f.status === 'pending' && (
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(f.id) }}
                    className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/60 rounded-full hidden group-hover:flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 pointer-events-none">
                  <p className="text-white text-xs truncate">{f.file.name}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
