'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Bell, CheckCircle2, CheckCheck, ClipboardList, GraduationCap,
  CalendarDays, Users, Building2, ShieldCheck
} from 'lucide-react'

const MODULE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  project:    { label: '프로젝트', icon: ClipboardList, color: 'bg-blue-100 text-blue-600' },
  education:  { label: '교육', icon: GraduationCap, color: 'bg-green-100 text-green-600' },
  schedule:   { label: '일정', icon: CalendarDays, color: 'bg-purple-100 text-purple-600' },
  hr:         { label: '인사', icon: Users, color: 'bg-pink-100 text-pink-600' },
  document:   { label: '문서', icon: Building2, color: 'bg-amber-100 text-amber-600' },
  inspection: { label: '검사', icon: ShieldCheck, color: 'bg-red-100 text-red-600' },
}

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  high:   { label: '긴급', color: 'bg-red-100 text-red-700' },
  medium: { label: '보통', color: 'bg-amber-100 text-amber-700' },
  low:    { label: '참고', color: 'bg-gray-100 text-gray-600' },
}

export default function NotificationClient({
  notifications: initNotifications,
  isSample,
}: {
  notifications: any[]
  isSample: boolean
}) {
  const [notifications, setNotifications] = useState(initNotifications)
  const unreadCount = notifications.filter((n: any) => !n.is_read).length

  async function markAsRead(id: number) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    if (!isSample) {
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }
  }

  async function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    if (!isSample) {
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Bell size={20} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">알림 센터</h1>
          <p className="text-xs text-gray-500">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : '모든 알림을 확인했습니다'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCheck size={14} />
            전체 읽음
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n: any) => {
          const config = MODULE_CONFIG[n.source_module] || MODULE_CONFIG.project
          const prio = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.low
          const Icon = config.icon

          return (
            <div
              key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={`bg-white rounded-xl border p-4 transition-colors ${
                n.is_read
                  ? 'border-gray-100'
                  : 'border-amber-200 bg-amber-50/30 cursor-pointer hover:bg-amber-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prio.color}`}>{prio.label}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.color}`}>{config.label}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">{n.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    {n.due_date && <span>기한: {formatDate(n.due_date)}</span>}
                    <span>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {notifications.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-green-400 mb-3" />
            <p className="text-gray-500 text-sm">알림이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
