import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const today = new Date()
  const thisMonth = today.getMonth() + 1 // 1~12
  const thisDay   = today.getDate()

  const { data: schedules } = await supabase
    .from('annual_schedules')
    .select('*')
    .eq('is_active', true)
    .order('target_month', { ascending: true })
    .order('target_day',   { ascending: true })

  // 각 일정에 D-day 계산 추가
  const enriched = (schedules ?? []).map((s: any) => {
    // 올해 또는 내년 기준으로 다음 도래일 계산
    let targetDate = new Date(today.getFullYear(), (s.target_month ?? 1) - 1, s.target_day ?? 1)
    if (targetDate < today) {
      // monthly는 다음 달, yearly는 내년
      if (s.recurrence === 'monthly') {
        targetDate = new Date(today.getFullYear(), today.getMonth() + 1, s.target_day ?? 1)
      } else {
        targetDate = new Date(today.getFullYear() + 1, (s.target_month ?? 1) - 1, s.target_day ?? 1)
      }
    }
    const diffMs = targetDate.getTime() - today.getTime()
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return { ...s, days_until: daysUntil, next_date: targetDate.toISOString().split('T')[0] }
  })

  // 이달 일정 수
  const thisMonthCount = (schedules ?? []).filter((s: any) =>
    s.target_month === thisMonth || s.recurrence === 'monthly'
  ).length

  // D-30 이내 임박
  const urgentCount = enriched.filter((s: any) => s.days_until <= 30 && s.days_until >= 0).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">연간 일정 스케줄</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            이달 일정 <strong className="text-blue-600">{thisMonthCount}건</strong>
            {urgentCount > 0 && (
              <span className="ml-2 text-yellow-600">· D-30 이내 <strong>{urgentCount}건</strong></span>
            )}
          </p>
        </div>
      </div>

      <ScheduleClient
        schedules={enriched}
        currentMonth={thisMonth}
        currentYear={today.getFullYear()}
        role={role}
      />
    </div>
  )
}
