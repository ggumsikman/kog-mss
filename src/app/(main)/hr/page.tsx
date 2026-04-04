import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import HrClient from './HrClient'

export default async function HrPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const today = new Date().toISOString().split('T')[0]
  const d30   = new Date(); d30.setDate(d30.getDate() + 30)

  const [{ data: events }, { data: users }, { data: departments }] = await Promise.all([
    supabase
      .from('hr_events')
      .select('*, users(id, name, position, joined_at, departments(name))')
      .order('due_date', { ascending: true }),
    supabase
      .from('users')
      .select('id, name, position, joined_at, department_id, departments(name)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('departments')
      .select('id, name')
      .order('name'),
  ])

  // D-day 계산
  const enriched = (events ?? []).map((e: any) => {
    const diff = Math.ceil(
      (new Date(e.due_date).getTime() - new Date(today).getTime()) / 86400000
    )
    return { ...e, days_until: diff }
  })

  const urgentCount  = enriched.filter(e => e.days_until >= 0 && e.days_until <= 30 && e.status === '대기').length
  const overdueCount = enriched.filter(e => e.days_until < 0  && e.status === '대기').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">인사·복지 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {urgentCount > 0 && <span className="text-yellow-600">D-30 이내 <strong>{urgentCount}건</strong></span>}
            {urgentCount > 0 && overdueCount > 0 && ' · '}
            {overdueCount > 0 && <span className="text-red-500">누락 위험 <strong>{overdueCount}건</strong></span>}
            {urgentCount === 0 && overdueCount === 0 && '모든 일정 정상'}
          </p>
        </div>
      </div>

      <HrClient
        events={enriched}
        users={users ?? []}
        departments={departments ?? []}
        today={today}
        role={role}
      />
    </div>
  )
}
