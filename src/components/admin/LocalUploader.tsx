'use client'
import { useState, useRef, useCallback } from 'react'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''

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

const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024

// 將過大的圖片於前端縮小/壓縮，避免超過 Cloudinary unsigned preset 的大小限制，
// 也能避免行動裝置上傳大檔時 fetch 因記憶體/網路不穩而失敗（顯示為 "Load failed"）。
async function compressImage(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('讀取圖片失敗'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('圖片解碼失敗'))
    el.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  let { width, height } = img
  let quality = 0.9

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) break

    if (blob.size <= maxBytes) {
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    }

    // 先降低畫質，畫質已經很低時改縮小尺寸
    if (quality > 0.5) {
      quality -= 0.15
    } else {
      width = Math.round(width * 0.75)
      height = Math.round(height * 0.75)
    }
  }

  // 退無可退，回傳最後一次嘗試的結果（即便仍超過上限，至少比原檔小）
  const finalBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5))
  return finalBlob ? new File([finalBlob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file
}

async function uploadToCloudinary(file: File): Promise<{ url: string; publicId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  let res: Response
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new Error('網路連線中斷或檔案過大，請檢查網路後重試')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Cloudinary 上傳失敗（HTTP ${res.status}）`)
  }
  const data = await res.json()
  return { url: data.secure_url, publicId: data.public_id }
}

function openFilePicker(opts: { capture?: string; multiple?: boolean; onChange: (f: FileList) => void }) {
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

  // 未設定 Cloudinary 時顯示設定提示
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm space-y-3">
        <p className="text-amber-400 font-semibold">⚙️ 需要設定 Cloudinary 環境變數</p>
        <p className="text-gray-400">請在 Vercel 的 Environment Variables 加入以下兩個變數，然後 Redeploy：</p>
        <div className="bg-[#111] rounded-lg p-3 font-mono text-xs text-gray-300 space-y-1">
          <div>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = <span className="text-amber-400">你的 Cloud name</span></div>
          <div>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = <span className="text-amber-400">你的 Upload preset</span></div>
        </div>
        <p className="text-gray-500 text-xs">
          免費申請：cloudinary.com → Settings → Upload → Upload presets → 新增 unsigned preset
        </p>
      </div>
    )
  }

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
      const [exif, uploadFile] = await Promise.all([
        extractExif(localFile.file),
        compressImage(localFile.file, MAX_UPLOAD_BYTES),
      ])
      const { url, publicId } = await uploadToCloudinary(uploadFile)

      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_type: 'local',
          drive_id: `cloudinary_${publicId}`,
          filename: localFile.file.name,
          thumbnail_url: url,
          full_url: url,
          exif,
        }),
      })

      if (res.ok || res.status === 409) {
        setFiles(prev => prev.map(f => f.id === localFile.id ? { ...f, status: 'done' } : f))
        onImported()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `儲存失敗（HTTP ${res.status}）`)
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

      {/* Mobile buttons */}
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
                onClick={() => { files.forEach(f => URL.revokeObjectURL(f.preview)); setFiles([]) }}
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

                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                  f.status === 'pending'   ? 'bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100' :
                  f.status === 'uploading' ? 'bg-black/50 opacity-100' :
                  f.status === 'error'     ? 'bg-black/70 opacity-100' : 'opacity-0'
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

                {f.status === 'done' && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                )}

                {f.status === 'pending' && (
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(f.id) }}
                    className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
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
