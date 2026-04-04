import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import WorklogClient from './WorklogClient'

export default async function WorklogsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const today = new Date().toISOString().split('T')[0]
  const targetDate = params.date || today

  const [{ data: logs }, { data: users }, { data: departments }] = await Promise.all([
    supabase
      .from('work_logs')
      .select('*, users(name, position, departments(name))')
      .eq('log_date', targetDate)
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('id, name, position, department_id, departments(name)')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('departments')
      .select('id, name')
      .order('name'),
  ])

  const total = logs?.length ?? 0
  const done  = logs?.filter(l => l.achieved).length ?? 0
  const pct   = total > 0 ? Math.round(done / total * 100) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">업무일지</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {targetDate === today ? '오늘' : targetDate} ·{' '}
            {total > 0
              ? <span>달성 <strong className={pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}>{done}/{total}건 ({pct}%)</strong></span>
              : '등록된 업무 없음'
            }
          </p>
        </div>
      </div>

      <WorklogClient
        logs={logs ?? []}
        users={users ?? []}
        departments={departments ?? []}
        targetDate={targetDate}
        today={today}
        role={role}
      />
    </div>
  )
}
