'use client'
import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import DriveImporter from '@/components/admin/DriveImporter'
import PhotoGrid from '@/components/admin/PhotoGrid'

export default function AdminPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'photos' | 'import'>('photos')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#0f0f0f]/90 backdrop-blur border-b border-[#2e2e2e] px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-xl">📷</span>
          <span className="font-semibold text-white">攝影管理後台</span>
        </div>
        <div className="flex gap-1 ml-6">
          {(['photos', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-amber-500 text-black font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              {tab === 'photos' ? '📁 照片管理' : '☁️ 匯入照片'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <a
            href="/gallery"
            target="_blank"
            className="text-xs text-gray-400 hover:text-amber-400 transition-colors"
          >
            前往前台 →
          </a>
          {session ? (
            <div className="flex items-center gap-3">
              {/* OneDrive connection badge or button */}
              {(session as any).microsoftAccessToken ? (
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                  OneDrive ✓
                </span>
              ) : (
                <button
                  onClick={() => signIn('azure-ad')}
                  className="text-xs text-gray-400 hover:text-blue-300 bg-[#242424] hover:bg-[#2a2a35] border border-[#3a3a3a] px-2 py-1 rounded-lg transition-colors"
                >
                  + OneDrive
                </button>
              )}
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                )}
                <span className="text-xs text-gray-400">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded"
                >
                  登出
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => signIn('google')}
                className="text-xs bg-[#242424] hover:bg-[#2e2e2e] border border-[#3a3a3a] px-3 py-1.5 rounded-lg transition-colors"
              >
                Google 登入
              </button>
              <button
                onClick={() => signIn('azure-ad')}
                className="text-xs bg-[#1a2535] hover:bg-[#1e2d42] border border-[#0078D4]/40 text-blue-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Microsoft 登入
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-6 max-w-7xl mx-auto">
        {activeTab === 'import' && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2e2e2e] p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">從雲端匯入照片</h2>
            <DriveImporter onImported={() => setRefreshKey((k) => k + 1)} />
          </div>
        )}

        {activeTab === 'photos' && (
          <PhotoGrid refreshKey={refreshKey} />
        )}
      </main>
    </div>
  )
}
