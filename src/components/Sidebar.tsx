'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ClipboardList, GraduationCap, CalendarDays,
  Users, FileText, ShieldCheck, Building2, LogOut, Settings,
} from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  admin:    '관리자',
  manager:  '매니저',
  employee: '직원',
}

const navItems = [
  { href: '/dashboard',    label: '대시보드',     icon: LayoutDashboard },
  { href: '/projects',     label: '프로젝트 관리', icon: ClipboardList },
  { href: '/worklogs',     label: '업무일지',      icon: FileText },
  { href: '/education',    label: '교육 관리',     icon: GraduationCap },
  { href: '/schedule',     label: '연간 일정',     icon: CalendarDays },
  { href: '/hr',           label: '인사·복지',     icon: Users },
  { href: '/documents',    label: '공문서 관리',   icon: Building2 },
  { href: '/inspections',  label: '정기검사',      icon: ShieldCheck },
]

export default function Sidebar({
  userName,
  userRole,
  deptName,
}: {
  userName: string
  userRole: string
  deptName: string
}) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen flex flex-col" style={{ background: '#1A2744' }}>
      {/* 로고 */}
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-xs font-semibold text-white/40 tracking-widest uppercase mb-1">KOG International</p>
        <h1 className="text-white font-bold text-base leading-tight">경영관리<br />시스템</h1>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}

        {/* 관리자 전용 메뉴 */}
        {userRole === 'admin' && (
          <Link href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 ${
              pathname.startsWith('/admin') ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white hover:bg-white/8'
            }`}
          >
            <Settings size={16} />
            사용자 관리
          </Link>
        )}
      </nav>

      {/* 사용자 정보 */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-sm font-semibold">{userName || '사용자'}</span>
          <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded">
            {ROLE_LABEL[userRole] ?? userRole}
          </span>
        </div>
        <p className="text-white/40 text-xs">{deptName}</p>
        <button onClick={handleLogout}
          className="mt-3 flex items-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors">
          <LogOut size={12} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
