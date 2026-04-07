import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { calcDaysUntil, formatDate } from '@/lib/utils'
import EducationClient from './EducationClient'
import { SAMPLE_EDUCATIONS, SAMPLE_DEPARTMENTS } from '@/lib/sample-data'

export default async function EducationPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; type?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const isSample = currentUser?.is_sample ?? false
  const today = new Date().toISOString().split('T')[0]

  let enriched: any[]
  let departments: any[]

  if (isSample) {
    let filtered = [...SAMPLE_EDUCATIONS]
    if (params.status && params.status !== 'all') filtered = filtered.filter(e => e.status === params.status)
    if (params.type   && params.type   !== 'all') filtered = filtered.filter(e => e.edu_type === params.type)
    if (params.dept   && params.dept   !== 'all') {
      const deptId = Number(params.dept)
      filtered = filtered.filter(e => e.education_targets?.some((t: any) => t.department_id === deptId))
    }
    enriched = filtered
    departments = SAMPLE_DEPARTMENTS
  } else {
    let query = supabase
      .from('education_schedules')
      .select(`
        *,
        education_targets(department_id, departments(name))
      `)
      .order('scheduled_date', { ascending: true })

    if (params.status && params.status !== 'all') query = query.eq('status', params.status)
    if (params.type   && params.type   !== 'all') query = query.eq('edu_type', params.type)

    const [{ data: educations }, { data: departmentsData }] = await Promise.all([
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
    enriched = filtered.map((e: any) => ({
      ...e,
      days_until: calcDaysUntil(e.scheduled_date),
    }))
    departments = departmentsData ?? []
  }

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
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
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
        departments={departments}
        today={today}
        role={role}
        isSample={isSample}
      />
    </div>
  )
}
