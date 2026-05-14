'use client'
import dynamic from 'next/dynamic'

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_MODE === 'true'
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || ''

const AdminClient = dynamic(() => import('./AdminClient'), { ssr: false })

export default function AdminPage() {
  if (IS_STATIC) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-amber-500 text-5xl mb-6">📷</div>
          <h1 className="text-white text-2xl font-bold mb-3">攝影管理後台</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            後台管理需要動態伺服器環境（Vercel），目前的 GitHub Pages 靜態版本不支援登入功能。
          </p>
          {ADMIN_URL ? (
            <a
              href={ADMIN_URL}
              className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              前往後台管理 →
            </a>
          ) : (
            <p className="text-gray-600 text-xs">
              請在 Vercel 部署版本上登入後台。<br />
              如需設定連結，請在環境變數加入 <code className="text-amber-600">NEXT_PUBLIC_ADMIN_URL</code>。
            </p>
          )}
          <div className="mt-8">
            <a
              href="../gallery"
              className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
            >
              ← 回到相簿
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <AdminClient />
}
