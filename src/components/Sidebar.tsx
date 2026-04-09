'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, FileText, GraduationCap, CalendarDays,
  Users, Building2, ShieldCheck, LogOut, Settings, Bell, Network,
  Menu, X, ChevronDown, FolderOpen, Heart, BarChart3, Briefcase,
} from 'lucide-react'

interface NavGroup {
  label: string
  icon: React.ElementType
  items: { href: string; label: string; icon: React.ElementType }[]
}

const navGroups: NavGroup[] = [
  {
    label: '인사관리',
    icon: Users,
    items: [
      { href: '/hr/employees', label: '직원 관리', icon: Users },
      { href: '/hr/org-chart', label: '조직도', icon: Network },
      { href: '/hr/welfare', label: '복지 관리', icon: Heart },
    ],
  },
  {
    label: '업무관리',
    icon: Briefcase,
    items: [
      { href: '/projects', label: '프로젝트', icon: ClipboardList },
      { href: '/worklogs', label: '업무일지', icon: FileText },
      { href: '/worklogs/report', label: '업무 리포트', icon: BarChart3 },
    ],
  },
  {
    label: '일정 · 검사',
    icon: CalendarDays,
    items: [
      { href: '/schedule', label: '연간 일정', icon: CalendarDays },
      { href: '/inspections', label: '정기검사', icon: ShieldCheck },
    ],
  },
  {
    label: '문서관리',
    icon: FolderOpen,
    items: [
      { href: '/documents', label: '공문서', icon: Building2 },
    ],
  },
  {
    label: '교육관리',
    icon: GraduationCap,
    items: [
      { href: '/education', label: '교육 일정', icon: GraduationCap },
    ],
  },
]

const adminGroup: NavGroup = {
  label: '시스템 설정',
  icon: Settings,
  items: [
    { href: '/admin', label: '사용자 관리', icon: Users },
    { href: '/admin/departments', label: '부서 관리', icon: Building2 },
  ],
}

export default function Sidebar({
  userName,
  userRole,
  userPosition,
  isSample = false,
}: {
  userName: string
  userRole: string
  userPosition: string
  isSample?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  // Auto-open the group that contains the current path
  useEffect(() => {
    const allGroups = [...navGroups, ...(userRole === 'admin' ? [adminGroup] : [])]
    for (const g of allGroups) {
      if (g.items.some(item => pathname.startsWith(item.href))) {
        setOpenGroups(prev => ({ ...prev, [g.label]: true }))
      }
    }
  }, [pathname, userRole])

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function toggleGroup(label: string) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  async function handleLogout() {
    document.cookie = isSample ? 'kog_demo=; path=/; max-age=0' : 'kog_user_id=; path=/; max-age=0'
    router.push('/login')
    router.refresh()
  }

  function renderGroup(group: NavGroup) {
    const isOpen = openGroups[group.label] ?? false
    const hasActive = group.items.some(item => pathname.startsWith(item.href))
    const Icon = group.icon

    return (
      <div key={group.label} className="mb-1">
        <button onClick={() => toggleGroup(group.label)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            hasActive ? 'text-white/90' : 'text-white/40 hover:text-white/60'
          }`}>
          <Icon size={14} />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="ml-3 pl-3 border-l border-white/10 space-y-0.5 mt-0.5 mb-2">
            {group.items.map(({ href, label, icon: ItemIcon }) => {
              const active = pathname === href || (href !== '/worklogs/report' && href !== '/worklogs' ? pathname.startsWith(href) : pathname === href)
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/8'
                  }`}>
                  <ItemIcon size={14} />
                  {label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <>
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-white/40 tracking-widest uppercase mb-0.5">KOG International</p>
          <h1 className="text-white font-bold text-base leading-tight">경영관리 시스템</h1>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
          <X size={20} />
        </button>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        {/* 대시보드 (독립) */}
        <Link href="/dashboard"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${
            pathname.startsWith('/dashboard') ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
          }`}>
          <LayoutDashboard size={16} />
          대시보드
        </Link>

        {/* 알림 센터 (독립) */}
        <Link href="/notifications"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-3 ${
            pathname.startsWith('/notifications') ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
          }`}>
          <Bell size={16} />
          알림 센터
        </Link>

        <div className="border-t border-white/10 pt-2 mb-1" />

        {/* 그룹 메뉴 */}
        {navGroups.map(renderGroup)}

        {/* 관리자 전용 */}
        {userRole === 'admin' && (
          <>
            <div className="border-t border-white/10 pt-2 mt-2 mb-1" />
            {renderGroup(adminGroup)}
          </>
        )}
      </nav>

      {/* 사용자 정보 */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-sm font-semibold">{userName || '사용자'}</span>
          {isSample
            ? <span className="text-xs bg-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded">SAMPLE</span>
            : <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded">{userPosition}</span>}
        </div>
        <button onClick={handleLogout} className="mt-2 flex items-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors">
          <LogOut size={12} /> 로그아웃
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: '#1A2744' }}>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-white/60 tracking-wider uppercase">KOG</p>
          <h1 className="text-white font-bold text-sm">경영관리 시스템</h1>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
          <Menu size={22} />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 min-h-screen flex-col" style={{ background: '#1A2744' }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: '#1A2744' }}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
