export interface Photo {
  id: number
  drive_type: 'google' | 'onedrive'
  drive_id: string
  filename: string
  thumbnail_url: string
  full_url: string
  taken_at: string | null
  camera_make: string | null
  camera_model: string | null
  lens_model: string | null
  aperture: number | null
  shutter_speed: string | null
  iso: number | null
  focal_length: number | null
  width: number | null
  height: number | null
  rating: number  // 1-5, 0 = unrated
  notes: string | null
  appreciation: string | null
  show_public: number  // 0 or 1
  likes: number
  created_at: string
  updated_at: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  webContentLink?: string
  createdTime?: string
  size?: string
}

export interface ExifData {
  taken_at?: string
  camera_make?: string
  camera_model?: string
  lens_model?: string
  aperture?: number
  shutter_speed?: string
  iso?: number
  focal_length?: number
  width?: number
  height?: number
}

export interface HistogramData {
  r: number[]
  g: number[]
  b: number[]
}
