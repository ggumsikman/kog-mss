import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { checkRestDay } from '@/lib/holidays'
import WorklogClient from './WorklogClient'
import {
  SAMPLE_WORK_LOGS, SAMPLE_USERS, SAMPLE_DEPARTMENTS,
  SAMPLE_ATTENDANCE, SAMPLE_SPECIAL_WORKDAYS,
} from '@/lib/sample-data'

export default async function WorklogsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const isSample = currentUser?.is_sample ?? false
  const today = new Date().toISOString().split('T')[0]
  const targetDate = params.date || today

  // 쉬는 날 판정
  const { isRest, label: restLabel } = checkRestDay(targetDate)

  let logs: any[] = []
  let users: any[] = []
  let departments: any[] = []
  let attendance: any[] = []
  let specialWorkday: { date: string; reason: string } | null = null

  if (isSample) {
    // 쉬는 날이라도 특근 여부 먼저 확인
    specialWorkday = SAMPLE_SPECIAL_WORKDAYS.find(d => d.date === targetDate) ?? null

    if (!isRest || specialWorkday) {
      logs = SAMPLE_WORK_LOGS.map((l: any) => ({
        ...l,
        title: l.title ?? '',
        log_type: l.log_type ?? '정기업무',
        description: l.description ?? '',
        is_planned: l.is_planned ?? true,
        note: l.note ?? '',
      }))
      attendance = SAMPLE_ATTENDANCE
    }
    users = SAMPLE_USERS
    departments = SAMPLE_DEPARTMENTS
  } else {
    // 특근 여부 먼저 확인 (쉬는 날이어도 fetch)
    if (isRest) {
      const { data } = await supabase
        .from('special_workdays')
        .select('date, reason')
        .eq('date', targetDate)
        .maybeSingle()
      specialWorkday = data ?? null
    }

    if (!isRest || specialWorkday) {
      const [
        { data: logsData },
        { data: usersData },
        { data: departmentsData },
        { data: attendanceData },
      ] = await Promise.all([
        supabase
          .from('work_logs')
          .select('*, users(name, position)')
          .eq('log_date', targetDate)
          .order('created_at', { ascending: true }),
        supabase
          .from('users')
          .select('id, name, position')
          .eq('is_active', true)
          .neq('role', 'admin')
          .order('name'),
        supabase
          .from('departments')
          .select('id, name')
          .order('name'),
        supabase
          .from('attendance_records')
          .select('id, user_id, date, type, note')
          .eq('date', targetDate),
      ])
      logs = logsData ?? []
      users = usersData ?? []
      departments = departmentsData ?? []
      attendance = attendanceData ?? []
    } else {
      // 쉬는 날인데 특근 아닌 경우: users만 fetch (특근 등록 폼에서 필요)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, position')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('name')
      users = usersData ?? []
    }
  }

  const submittedUserIds = new Set(logs.map((l: any) => l.user_id))
  const nonSubmitters = users.filter((u: any) => !submittedUserIds.has(u.id))

  const total = logs.length
  const done  = logs.filter((l: any) => l.achieved).length
  const pct   = total > 0 ? Math.round(done / total * 100) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">업무일지 · 근태</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {targetDate === today ? '오늘' : targetDate} ·{' '}
            {isRest && !specialWorkday
              ? <span className="text-gray-400">{restLabel}</span>
              : total > 0
                ? <span>달성 <strong className={pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}>{done}/{total}건 ({pct}%)</strong></span>
                : '등록된 업무 없음'
            }
          </p>
        </div>
        <a
          href={`/worklogs/report?type=daily&date=${targetDate}`}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A2744] border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:border-[#1A2744]"
        >
          📊 보고서
        </a>
      </div>

      <WorklogClient
        logs={logs}
        users={users}
        departments={departments}
        attendance={attendance}
        nonSubmitters={nonSubmitters}
        targetDate={targetDate}
        today={today}
        role={role}
        currentUserId={currentUser?.id ?? 0}
        isSample={isSample}
        isRestDay={isRest}
        restLabel={restLabel}
        specialWorkday={specialWorkday}
      />
    </div>
  )
}
