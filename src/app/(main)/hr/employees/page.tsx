import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { SAMPLE_USERS, SAMPLE_DEPARTMENTS } from '@/lib/sample-data'
import { formatDate } from '@/lib/utils'
import { Users, Search, Building2 } from 'lucide-react'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false

  let users: any[]
  let departments: any[]

  if (isSample) {
    users = SAMPLE_USERS.map(u => ({ ...u, is_active: true, role: 'staff', email: `${u.name}@kog.co.kr` }))
    departments = SAMPLE_DEPARTMENTS
  } else {
    const [{ data: usersData }, { data: deptData }] = await Promise.all([
      supabase.from('users').select('*, departments(name)').order('name'),
      supabase.from('departments').select('*').order('name'),
    ])
    users = usersData ?? []
    departments = deptData ?? []
  }

  const deptMap = Object.fromEntries(departments.map((d: any) => [d.id, d.name]))

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Users size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">직원 관리</h1>
          <p className="text-xs text-gray-500">전체 직원 {users.length}명</p>
        </div>
      </div>

      {/* 직원 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">이름</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">직위</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">부서</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">입사일</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">근속연수</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user: any) => {
                const joinedDate = new Date(user.joined_at)
                const years = Math.floor((Date.now() - joinedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                const deptName = user.departments?.name || deptMap[user.department_id] || '-'
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {user.name?.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{user.position || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <Building2 size={12} className="text-gray-400" />
                        {deptName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(user.joined_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{years > 0 ? `${years}년` : '1년 미만'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.is_active !== false ? '재직' : '퇴직'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
