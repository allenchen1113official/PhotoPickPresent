'use client'
import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import DriveImporter from '@/components/admin/DriveImporter'
import PhotoGrid from '@/components/admin/PhotoGrid'
import LocalUploader from '@/components/admin/LocalUploader'

type Tab = 'photos' | 'import' | 'upload'

const TAB_LABELS: Record<Tab, string> = {
  photos: '📁 照片管理',
  import: '☁️ 雲端匯入',
  upload: '📤 本機上傳',
}

export default function AdminClient() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('photos')
  const [refreshKey, setRefreshKey] = useState(0)

  function handleImported() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      <nav className="sticky top-0 z-40 bg-[#0f0f0f]/90 backdrop-blur border-b border-[#2e2e2e] px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-xl">📷</span>
          <span className="font-semibold text-white text-sm sm:text-base whitespace-nowrap">攝影管理後台</span>
        </div>
        <div className="flex gap-1 overflow-x-auto sm:ml-6 -mx-1 px-1 sm:mx-0 sm:px-0">
          {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-amber-500 text-black font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-end gap-3 flex-wrap order-last sm:order-none">
          <a
            href="/gallery"
            target="_blank"
            className="text-xs text-gray-400 hover:text-amber-400 transition-colors whitespace-nowrap"
          >
            前往前台 →
          </a>
          {session ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {(session as any).microsoftAccessToken ? (
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                  OneDrive ✓
                </span>
              ) : (
                <button
                  onClick={() => signIn('azure-ad')}
                  className="text-xs text-gray-400 hover:text-blue-300 bg-[#242424] hover:bg-[#2a2a35] border border-[#3a3a3a] px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                >
                  + OneDrive
                </button>
              )}
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                )}
                <span className="text-xs text-gray-400 hidden sm:inline truncate max-w-[8rem]">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded whitespace-nowrap"
                >
                  登出
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => signIn('google')}
                className="text-xs bg-[#242424] hover:bg-[#2e2e2e] border border-[#3a3a3a] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Google 登入
              </button>
              <button
                onClick={() => signIn('azure-ad')}
                className="text-xs bg-[#1a2535] hover:bg-[#1e2d42] border border-[#0078D4]/40 text-blue-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Microsoft 登入
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        {activeTab === 'photos' && (
          <PhotoGrid refreshKey={refreshKey} />
        )}

        {activeTab === 'import' && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2e2e2e] p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4 text-white">從雲端匯入照片</h2>
            <DriveImporter onImported={handleImported} />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#2e2e2e] p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-1 text-white">本機 / 手機上傳</h2>
            <p className="text-gray-500 text-sm mb-6">
              從電腦或手機直接上傳照片，自動讀取 EXIF 資訊（拍攝時間、相機型號等）。
            </p>
            <LocalUploader onImported={handleImported} />
          </div>
        )}
      </main>
    </div>
  )
}
