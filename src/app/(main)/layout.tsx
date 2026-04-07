import Sidebar from '@/components/Sidebar'
import { getCurrentUser } from '@/lib/auth/getUser'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false

  return (
    <div className="flex min-h-screen">
      <div className="print:hidden">
        <Sidebar
          userName={currentUser?.name ?? ''}
          userRole={currentUser?.role ?? 'staff'}
          userPosition={currentUser?.position ?? ''}
          isSample={isSample}
        />
      </div>
      <main className="flex-1 overflow-auto flex flex-col">
        {isSample && (
          <div className="print:hidden bg-amber-400 text-amber-900 text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-40">
            <span>👁️</span>
            <span>샘플 모드 — 실제 데이터가 아닙니다. 읽기 전용으로 동작합니다.</span>
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
        <footer className="print:hidden px-6 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <span>© 2026 (주)코그인터내셔널 · All rights reserved.</span>
          <span className="text-gray-300">|</span>
          <span>시스템 개발 · <span className="font-bold text-pink-500">꿈식판 꿈식맨</span></span>
        </footer>
      </main>
    </div>
  )
}
