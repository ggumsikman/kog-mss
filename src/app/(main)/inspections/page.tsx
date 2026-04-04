import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import InspectionClient from './InspectionClient'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const today = new Date().toISOString().split('T')[0]

  const [{ data: inspections }, { data: departments }] = await Promise.all([
    supabase
      .from('inspections')
      .select('*, departments(name)')
      .order('next_due_date', { ascending: true }),
    supabase
      .from('departments')
      .select('id, name')
      .order('name'),
  ])

  // 상태 자동 계산
  const enriched = (inspections ?? []).map((ins: any) => {
    const daysUntil = Math.ceil(
      (new Date(ins.next_due_date).getTime() - new Date(today).getTime()) / 86400000
    )
    let status: '정상' | '임박' | '만료'
    if (daysUntil < 0)        status = '만료'
    else if (daysUntil <= 30) status = '임박'
    else                       status = '정상'
    return { ...ins, days_until: daysUntil, status }
  })

  const expiredCount = enriched.filter(i => i.status === '만료').length
  const urgentCount  = enriched.filter(i => i.status === '임박').length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">정기검사 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {expiredCount > 0 && (
              <span className="text-red-500 font-semibold">만료 {expiredCount}건 즉시 처리 필요
                {urgentCount > 0 ? ' · ' : ''}
              </span>
            )}
            {urgentCount > 0 && (
              <span className="text-yellow-600 font-semibold">30일 이내 {urgentCount}건 임박</span>
            )}
            {expiredCount === 0 && urgentCount === 0 && (
              <span className="text-green-600 font-semibold">모든 검사 정상</span>
            )}
          </p>
        </div>
      </div>

      <InspectionClient
        inspections={enriched}
        departments={departments ?? []}
        today={today}
        role={role}
      />
    </div>
  )
}
