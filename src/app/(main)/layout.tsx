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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
