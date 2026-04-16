import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { SAMPLE_USERS, SAMPLE_DEPARTMENTS } from '@/lib/sample-data'
import { Network, Users, Building2 } from 'lucide-react'

export default async function OrgChartPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false

  let users: any[]
  let departments: any[]

  if (isSample) {
    users = SAMPLE_USERS
    departments = SAMPLE_DEPARTMENTS
  } else {
    const [{ data: usersData }, { data: deptData }] = await Promise.all([
      supabase.from('users').select('*, departments(name)').eq('is_active', true).order('position'),
      supabase.from('departments').select('*').order('name'),
    ])
    users = usersData ?? []
    departments = deptData ?? []
  }

  // 부서별 직원 그룹핑
  const deptGroups = departments.map((dept: any) => ({
    ...dept,
    members: users.filter((u: any) => u.department_id === dept.id),
  }))

  const positionOrder: Record<string, number> = { '부장': 1, '차장': 2, '과장': 3, '대리': 4, '주임': 5, '사원': 6 }

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Network size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">조직도</h1>
          <p className="text-xs text-gray-500">{departments.length}개 부서 · {users.length}명</p>
        </div>
      </div>

      {/* 회사명 */}
      <div className="text-center mb-8">
        <div className="inline-block bg-[#1A2744] text-white font-bold px-8 py-3 rounded-xl text-base">
          (주)코그인터내셔널
        </div>
        <div className="w-px h-8 bg-gray-300 mx-auto" />
      </div>

      {/* 부서 트리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {deptGroups.map((dept: any) => {
          const sorted = [...dept.members].sort((a: any, b: any) =>
            (positionOrder[a.position] ?? 99) - (positionOrder[b.position] ?? 99)
          )
          const leader = sorted[0]
          const staff = sorted.slice(1)

          return (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 부서 헤더 */}
              <div className="bg-[#1A2744] px-4 py-3 flex items-center gap-2">
                <Building2 size={16} className="text-white/70" />
                <span className="text-white font-bold text-sm">{dept.name}</span>
                <span className="text-white/50 text-xs ml-auto">{dept.members.length}명</span>
              </div>

              {/* 부서장 */}
              {leader && (
                <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {leader.name?.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{leader.name}</p>
                      <p className="text-xs text-blue-600 font-semibold">{leader.position}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 팀원 */}
              <div className="divide-y divide-gray-50">
                {staff.map((member: any) => (
                  <div key={member.id} className="px-4 py-2.5 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {member.name?.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.position}</p>
                    </div>
                  </div>
                ))}
                {dept.members.length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-gray-400">소속 직원 없음</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 미배정 직원 */}
      {(() => {
        const unassigned = users.filter((u: any) => !u.department_id)
        if (unassigned.length === 0) return null
        const sorted = [...unassigned].sort((a: any, b: any) =>
          (positionOrder[a.position] ?? 99) - (positionOrder[b.position] ?? 99)
        )
        return (
          <div className="mt-6">
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden max-w-sm">
              <div className="bg-amber-500 px-4 py-3 flex items-center gap-2">
                <Users size={16} className="text-white/80" />
                <span className="text-white font-bold text-sm">미배정 직원</span>
                <span className="text-white/60 text-xs ml-auto">{unassigned.length}명</span>
              </div>
              <div className="divide-y divide-gray-50">
                {sorted.map((member: any) => (
                  <div key={member.id} className="px-4 py-2.5 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                      {member.name?.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
