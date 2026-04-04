import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import DocumentClient from './DocumentClient'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('official_documents')
    .select(`
      *,
      users!received_by(name, position),
      handler:users!handler_id(name),
      departments(name)
    `)
    .order('received_date', { ascending: false })

  if (params.status   && params.status   !== 'all') query = query.eq('status', params.status)
  if (params.category && params.category !== 'all') query = query.eq('category', params.category)

  const [{ data: docs }, { data: users }, { data: departments }] = await Promise.all([
    query,
    supabase.from('users').select('id, name, position, departments(name)').eq('is_active', true).order('name'),
    supabase.from('departments').select('id, name').order('name'),
  ])

  // 3일 이상 미처리 계산
  const enriched = (docs ?? []).map((d: any) => {
    const daysSince = Math.floor(
      (new Date(today).getTime() - new Date(d.received_date).getTime()) / 86400000
    )
    return { ...d, days_since: daysSince }
  })

  const pendingCount  = enriched.filter(d => ['접수', '처리중'].includes(d.status)).length
  const overdueCount  = enriched.filter(d => ['접수', '처리중'].includes(d.status) && d.days_since >= 3).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">공문서 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            미처리 <strong className={pendingCount > 0 ? 'text-blue-600' : ''}>{pendingCount}건</strong>
            {overdueCount > 0 && (
              <span className="ml-2 text-red-500">· 3일 초과 <strong>{overdueCount}건</strong> 즉시 처리 필요</span>
            )}
          </p>
        </div>
      </div>

      <DocumentClient
        docs={enriched}
        users={users ?? []}
        departments={departments ?? []}
        today={today}
        role={role}
      />
    </div>
  )
}
