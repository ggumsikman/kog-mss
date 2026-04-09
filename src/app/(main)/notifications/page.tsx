import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { formatDate } from '@/lib/utils'
import { Bell, AlertTriangle, Info, CheckCircle2, ClipboardList, GraduationCap, CalendarDays, Users, Building2, ShieldCheck } from 'lucide-react'

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

// 샘플 알림 데이터
const SAMPLE_NOTIFICATIONS = [
  { id: 1, source_module: 'inspection', title: '크레인 안전검사 D-4', message: '생산부 크레인 안전검사가 4일 후 만료됩니다. 즉시 검사 일정을 잡아주세요.', priority: 'high', is_read: false, due_date: '2026-04-09', created_at: '2026-04-05T09:00:00' },
  { id: 2, source_module: 'inspection', title: '전기안전 정기점검 만료', message: '생산부 전기안전 정기점검이 44일 경과했습니다.', priority: 'high', is_read: false, due_date: '2026-02-20', created_at: '2026-04-05T09:00:00' },
  { id: 3, source_module: 'document', title: '환경부 배출허용기준 통보 미처리', message: '환경부 공문이 접수 후 아직 처리되지 않았습니다. 4월 15일까지 회신 필요.', priority: 'high', is_read: false, due_date: '2026-04-15', created_at: '2026-04-04T10:00:00' },
  { id: 4, source_module: 'hr', title: '박민준 대리 계약 만료 D-5', message: '생산부 박민준 대리의 계약이 5일 후 만료됩니다. 갱신 여부를 결정해주세요.', priority: 'high', is_read: false, due_date: '2026-04-10', created_at: '2026-04-05T08:00:00' },
  { id: 5, source_module: 'project', title: '생산라인 효율화 프로젝트 지연', message: '생산라인 효율화 프로젝트가 35일 지연 중입니다. 진척률 30%.', priority: 'medium', is_read: true, due_date: '2026-03-01', created_at: '2026-04-03T14:00:00' },
  { id: 6, source_module: 'education', title: '소방 안전교육 D-15', message: '4월 20일 소방 안전교육이 예정되어 있습니다. 대상: 생산부.', priority: 'medium', is_read: true, due_date: '2026-04-20', created_at: '2026-04-05T07:00:00' },
  { id: 7, source_module: 'schedule', title: '정기 설비 보전 점검 D-10', message: '4월 15일 정기 설비 보전 점검이 예정되어 있습니다.', priority: 'low', is_read: true, due_date: '2026-04-15', created_at: '2026-04-05T07:00:00' },
  { id: 8, source_module: 'hr', title: '이영희 과장 건강검진 D-25', message: '4월 30일까지 건강검진을 완료해주세요.', priority: 'low', is_read: true, due_date: '2026-04-30', created_at: '2026-04-05T07:00:00' },
]

export default async function NotificationsPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false

  let notifications: any[]

  if (isSample) {
    notifications = SAMPLE_NOTIFICATIONS
  } else {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    notifications = data ?? []
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Bell size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">알림 센터</h1>
          <p className="text-xs text-gray-500">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : '모든 알림을 확인했습니다'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {notifications.map((n: any) => {
          const config = MODULE_CONFIG[n.source_module] || MODULE_CONFIG.project
          const prio = PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.low
          const Icon = config.icon

          return (
            <div key={n.id} className={`bg-white rounded-xl border p-4 transition-colors ${
              n.is_read ? 'border-gray-100' : 'border-amber-200 bg-amber-50/30'
            }`}>
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
