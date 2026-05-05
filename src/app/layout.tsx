import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'

const SITE_NAME = 'Allen Chen Photography'
const SITE_DESC = '用光影記錄生活瞬間｜風景、人像、街頭攝影作品集。每一張照片都是一個故事。'
const SITE_URL = process.env.NEXTAUTH_URL || 'https://your-domain.com'
const OG_IMAGE = `${SITE_URL}/og-image.jpg`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | 攝影作品集`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    '攝影', '攝影作品集', '風景攝影', '人像攝影', '街頭攝影',
    'photography', 'photo gallery', 'photographer', 'Allen Chen',
    '台灣攝影師', '攝影師', 'Canon', 'Sony', '風光攝影',
  ],
  authors: [{ name: 'Allen Chen', url: SITE_URL }],
  creator: 'Allen Chen',
  publisher: 'Allen Chen Photography',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Open Graph（Facebook / LINE 分享預覽）
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | 攝影作品集`,
    description: SITE_DESC,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} 攝影作品集` }],
  },
  // Twitter / X Card
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | 攝影作品集`,
    description: SITE_DESC,
    images: [OG_IMAGE],
    creator: '@allenchen',
  },
  // 其他 SEO
  alternates: { canonical: SITE_URL },
  category: 'photography',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f0f',
}

// JSON-LD 結構化資料（Google 搜尋增強）
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESC,
  mainEntity: {
    '@type': 'Person',
    name: 'Allen Chen',
    jobTitle: '攝影師',
    url: SITE_URL,
    sameAs: [
      'https://www.instagram.com/your_ig_handle',
      'https://www.facebook.com/your_fb_page',
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Preconnect 加速 Google Drive 圖片載入 */}
        <link rel="preconnect" href="https://drive.google.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://drive.google.com" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
