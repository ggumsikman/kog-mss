import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { SAMPLE_DEPARTMENTS, SAMPLE_USERS } from '@/lib/sample-data'
import { redirect } from 'next/navigation'
import { Building2, Users, Settings } from 'lucide-react'
import DepartmentClient from './DepartmentClient'

export default async function DepartmentsPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false

  if (!isSample && currentUser?.role !== 'admin') {
    redirect('/dashboard')
  }

  let departments: any[]
  let users: any[]

  if (isSample) {
    departments = SAMPLE_DEPARTMENTS.map(d => ({
      ...d,
      member_count: SAMPLE_USERS.filter(u => u.department_id === d.id).length,
    }))
    users = SAMPLE_USERS
  } else {
    const [{ data: deptData }, { data: usersData }] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('users').select('id, name, position, department_id').eq('is_active', true).order('name'),
    ])

    const memberCount: Record<number, number> = {}
    ;(usersData ?? []).forEach((u: any) => {
      memberCount[u.department_id] = (memberCount[u.department_id] || 0) + 1
    })

    departments = (deptData ?? []).map((d: any) => ({
      ...d,
      member_count: memberCount[d.id] || 0,
    }))
    users = usersData ?? []
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Building2 size={20} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">부서 관리</h1>
          <p className="text-xs text-gray-500">전체 {departments.length}개 부서</p>
        </div>
      </div>

      <DepartmentClient departments={departments} users={users} isSample={isSample} />
    </div>
  )
}
