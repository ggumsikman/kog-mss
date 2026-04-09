import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { SAMPLE_ATTENDANCE, SAMPLE_USERS, SAMPLE_DEPARTMENTS } from '@/lib/sample-data'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false
  const role = currentUser?.role ?? 'staff'

  let attendance: any[]
  let users: any[]
  let departments: any[]

  if (isSample) {
    attendance = SAMPLE_ATTENDANCE
    users = SAMPLE_USERS.filter(u => u.role !== 'admin')
    departments = SAMPLE_DEPARTMENTS
  } else {
    const [{ data: attData }, { data: usersData }, { data: deptData }] = await Promise.all([
      supabase.from('attendance_records')
        .select('*, users(name, position, department_id, departments(name))')
        .order('date', { ascending: false }),
      supabase.from('users')
        .select('id, name, position, department_id, departments(name)')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('name'),
      supabase.from('departments').select('*').order('name'),
    ])
    attendance = attData ?? []
    users = usersData ?? []
    departments = deptData ?? []
  }

  return (
    <AttendanceClient
      attendance={attendance}
      users={users}
      departments={departments}
      role={role}
      isSample={isSample}
    />
  )
}
