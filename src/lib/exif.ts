import type { ExifData } from '@/types'

export function formatShutterSpeed(val: number | undefined): string | undefined {
  if (!val) return undefined
  if (val >= 1) return `${val}s`
  const denom = Math.round(1 / val)
  return `1/${denom}s`
}

export function formatAperture(val: number | undefined): string | undefined {
  if (!val) return undefined
  return `f/${val.toFixed(1)}`
}

// Parse EXIF from a buffer using exifr (called client-side or server-side)
export async function parseExifFromUrl(imageUrl: string): Promise<ExifData> {
  try {
    // Dynamic import for exifr (works in browser and Node.js)
    const exifr = await import('exifr')
    const data = await exifr.default.parse(imageUrl, {
      tiff: true,
      exif: true,
      gps: false,
      iptc: false,
      xmp: false,
    })
    if (!data) return {}

    return {
      taken_at: data.DateTimeOriginal
        ? new Date(data.DateTimeOriginal).toISOString()
        : data.CreateDate
        ? new Date(data.CreateDate).toISOString()
        : undefined,
      camera_make: data.Make || undefined,
      camera_model: data.Model || undefined,
      lens_model: data.LensModel || undefined,
      aperture: data.FNumber || data.ApertureValue || undefined,
      shutter_speed: formatShutterSpeed(data.ExposureTime),
      iso: data.ISO || data.ISOSpeedRatings || undefined,
      focal_length: data.FocalLength || undefined,
      width: data.ExifImageWidth || data.ImageWidth || undefined,
      height: data.ExifImageHeight || data.ImageHeight || undefined,
    }
  } catch {
    return {}
  }
}
