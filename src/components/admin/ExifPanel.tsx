import type { Photo } from '@/types'

interface ExifPanelProps {
  photo: Photo
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-[#2a2a2a] last:border-0">
      <span className="text-gray-500 text-xs whitespace-nowrap">{label}</span>
      <span className="text-gray-200 text-xs text-right font-mono">{String(value)}</span>
    </div>
  )
}

export default function ExifPanel({ photo }: ExifPanelProps) {
  const takenAt = photo.taken_at
    ? new Date(photo.taken_at).toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : null

  return (
    <div className="rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] p-3 text-sm">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">EXIF 資訊</h3>
      <div className="space-y-0">
        <Row label="拍攝時間" value={takenAt} />
        <Row label="相機品牌" value={photo.camera_make} />
        <Row label="相機型號" value={photo.camera_model} />
        <Row label="鏡頭" value={photo.lens_model} />
        <Row label="光圈" value={photo.aperture ? `f/${photo.aperture.toFixed(1)}` : null} />
        <Row label="快門速度" value={photo.shutter_speed} />
        <Row label="感光度" value={photo.iso ? `ISO ${photo.iso}` : null} />
        <Row label="焦距" value={photo.focal_length ? `${photo.focal_length}mm` : null} />
        <Row
          label="尺寸"
          value={photo.width && photo.height ? `${photo.width} × ${photo.height}` : null}
        />
      </div>
    </div>
  )
}
