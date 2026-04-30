import type { Metadata } from 'next'

const SITE_URL = process.env.NEXTAUTH_URL || 'https://your-domain.com'

export const galleryMetadata: Metadata = {
  title: '攝影作品集',
  description: '精選攝影作品展示，包含風景、人像、街頭攝影。每張作品都附有拍攝參數（光圈、快門、ISO）與賞析說明。',
  alternates: { canonical: `${SITE_URL}/gallery` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/gallery`,
    title: 'Allen Chen 攝影作品集',
    description: '精選攝影作品展示，附拍攝參數與賞析說明。',
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
}

// 單張照片分享的 Open Graph 動態生成
export function photoMetadata(photo: {
  filename: string
  appreciation?: string | null
  thumbnail_url?: string | null
  taken_at?: string | null
}): Metadata {
  const title = photo.filename.replace(/\.[^.]+$/, '')
  const desc = photo.appreciation || `攝影作品：${title}`
  return {
    title,
    description: desc,
    openGraph: {
      type: 'article',
      title: `${title} | Allen Chen Photography`,
      description: desc,
      images: photo.thumbnail_url
        ? [{ url: photo.thumbnail_url, width: 800, height: 600, alt: title }]
        : [],
      publishedTime: photo.taken_at || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Allen Chen Photography`,
      description: desc,
      images: photo.thumbnail_url ? [photo.thumbnail_url] : [],
    },
  }
}
