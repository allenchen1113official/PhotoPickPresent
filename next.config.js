/** @type {import('next').NextConfig} */

// GitHub Pages 靜態建置模式
// 啟用：STATIC_BUILD=true npm run build
const isStaticBuild = process.env.STATIC_BUILD === 'true'

// GitHub Pages 子目錄路徑（例如 /photo-gallery）
// GitHub Actions 會自動設定 NEXT_PUBLIC_BASE_PATH
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig = {
  // 靜態匯出（GitHub Pages 必要）
  output: isStaticBuild ? 'export' : undefined,

  // GitHub Pages 子目錄設定
  basePath: basePath,
  assetPrefix: basePath || undefined,

  // 靜態建置時加入尾斜線，讓 GitHub Pages 正確路由
  trailingSlash: isStaticBuild ? true : false,

  images: {
    // 靜態匯出必須關閉 Next.js 圖片最佳化（Google Drive 圖片走原始 URL）
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig
