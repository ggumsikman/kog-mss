import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { calcDelayDays, formatDate, getStatusColor } from '@/lib/utils'
import { AlertTriangle, Plus, Filter } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const canManage = role === 'admin' || role === 'manager'
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('projects')
    .select('*, departments(name), users(name, position)')
    .order('due_date', { ascending: true })

  if (params.status) query = query.eq('status', params.status)
  if (params.category) query = query.eq('category', params.category)

  const { data: projects } = await query

  // 지연 자동 체크 (due_date 지났고 완료 아닌 것)
  const enriched = (projects || []).map((p: any) => ({
    ...p,
    computed_status: p.status !== '완료' && p.due_date < today ? '지연' : p.status,
    delay_days: p.due_date < today && p.status !== '완료' ? calcDelayDays(p.due_date) : 0,
  }))

  const categories = ['VSM', '영업', '품질', '기타']
  const statuses = ['전체', '진행중', '지연', '완료', '보류']

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">프로젝트 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">총 {enriched.length}개 프로젝트</p>
        </div>
        {canManage && (
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors"
          >
            <Plus size={15} />
            프로젝트 등록
          </Link>
        )}
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {statuses.map(s => {
          const active = (s === '전체' && !params.status) || params.status === s
          return (
            <Link
              key={s}
              href={s === '전체' ? '/projects' : `/projects?status=${s}`}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? s === '지연' ? 'bg-red-600 text-white border-red-600'
                    : 'bg-[#1A2744] text-white border-[#1A2744]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s === '지연' && '🔴 '}{s}
              {s === '지연' && enriched.filter(p => p.computed_status === '지연').length > 0 &&
                <span className="ml-1">({enriched.filter(p => p.computed_status === '지연').length})</span>
              }
            </Link>
          )
        })}
      </div>

      {/* 프로젝트 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs">프로젝트명</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 text-xs">구분</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-xs">부서 / 담당자</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 text-xs">마감일</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 text-xs">진도</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 text-xs">상태</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {enriched.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">프로젝트가 없습니다</td></tr>
            ) : (
              enriched.map((p: any) => (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 transition-colors ${p.computed_status === '지연' ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {p.computed_status === '지연' && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                      <span className="font-semibold text-gray-800">{p.title}</span>
                    </div>
                    {p.delay_days > 0 && (
                      <p className="text-xs text-red-500 mt-0.5 ml-5">⚠ {p.delay_days}일 초과</p>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.category}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="text-xs text-gray-500">{p.departments?.name}</p>
                    <p className="font-medium text-gray-700">{p.users?.name}</p>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className={`text-xs ${p.computed_status === '지연' ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      {formatDate(p.due_date)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${p.computed_status === '지연' ? 'bg-red-400' : 'bg-blue-500'}`}
                          style={{ width: `${p.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{p.progress_pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(p.computed_status)}`}>
                      {p.computed_status}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <Link href={`/projects/${p.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
