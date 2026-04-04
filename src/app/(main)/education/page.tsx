import { createClient } from '@/lib/supabase/server'
import { calcDaysUntil, formatDate } from '@/lib/utils'
import EducationClient from './EducationClient'

export default async function EducationPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; type?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('education_schedules')
    .select(`
      *,
      education_targets(department_id, departments(name))
    `)
    .order('scheduled_date', { ascending: true })

  if (params.status && params.status !== 'all') query = query.eq('status', params.status)
  if (params.type   && params.type   !== 'all') query = query.eq('edu_type', params.type)

  const [{ data: educations }, { data: departments }] = await Promise.all([
    query,
    supabase.from('departments').select('id, name').order('name'),
  ])

  // 부서 필터 (education_targets 기준)
  let filtered = educations ?? []
  if (params.dept && params.dept !== 'all') {
    const deptId = Number(params.dept)
    filtered = filtered.filter((e: any) =>
      e.education_targets?.some((t: any) => t.department_id === deptId)
    )
  }

  // D-day 계산 추가
  const enriched = filtered.map((e: any) => ({
    ...e,
    days_until: calcDaysUntil(e.scheduled_date),
  }))

  // 이달 예정 수
  const thisMonth = today.slice(0, 7)
  const thisMonthCount = enriched.filter((e: any) =>
    e.scheduled_date?.startsWith(thisMonth) && e.status === '예정'
  ).length

  // 의무 미이수 (예정인데 날짜 지난 것)
  const overdueCount = enriched.filter((e: any) =>
    e.scheduled_date < today && e.status === '예정'
  ).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">교육 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            이달 예정 <strong className="text-blue-600">{thisMonthCount}건</strong>
            {overdueCount > 0 && (
              <span className="ml-2 text-red-500">· 기한 초과 <strong>{overdueCount}건</strong></span>
            )}
          </p>
        </div>
      </div>

      <EducationClient
        educations={enriched}
        departments={departments ?? []}
        today={today}
      />
    </div>
  )
}
