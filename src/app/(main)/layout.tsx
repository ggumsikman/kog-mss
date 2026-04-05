import Sidebar from '@/components/Sidebar'
import { getCurrentUser } from '@/lib/auth/getUser'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser()

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={currentUser?.name ?? ''}
        userRole={currentUser?.role ?? 'employee'}
        deptName={
          Array.isArray(currentUser?.departments)
            ? currentUser.departments[0]?.name
            : currentUser?.departments?.name ?? ''
        }
      />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="px-6 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <span>© 2026 (주)코그인터내셔널 · All rights reserved.</span>
          <span className="text-gray-300">|</span>
          <span>시스템 개발 · <span className="font-bold text-pink-500">꿈식판 꿈식맨</span></span>
        </footer>
      </main>
    </div>
  )
}
