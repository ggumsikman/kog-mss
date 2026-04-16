import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { SAMPLE_ATTENDANCE, SAMPLE_USERS, SAMPLE_DEPARTMENTS, SAMPLE_LEAVE_QUOTAS } from '@/lib/sample-data'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false
  const role = currentUser?.role ?? 'staff'
  const currentUserId = currentUser?.id ?? 0

  let attendance: any[]
  let users: any[]
  let departments: any[]
  let leaveQuotas: any[]

  if (isSample) {
    attendance = SAMPLE_ATTENDANCE
    users = SAMPLE_USERS.filter(u => u.role !== 'admin')
    departments = SAMPLE_DEPARTMENTS
    leaveQuotas = SAMPLE_LEAVE_QUOTAS
  } else {
    const currentYear = new Date().getFullYear()
    const [{ data: attData }, { data: usersData }, { data: deptData }, { data: quotaData }] = await Promise.all([
      supabase.from('attendance_records')
        .select('*, users(name, position, department_id, departments(name))')
        .order('date', { ascending: false }),
      supabase.from('users')
        .select('id, name, position, role, department_id, departments(name)')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('leave_quotas')
        .select('*')
        .eq('year', currentYear),
    ])
    attendance = attData ?? []
    users = usersData ?? []
    departments = deptData ?? []
    leaveQuotas = quotaData ?? []
  }

  return (
    <AttendanceClient
      attendance={attendance}
      users={users}
      departments={departments}
      leaveQuotas={leaveQuotas}
      role={role}
      isSample={isSample}
      currentUserId={currentUserId}
    />
  )
}
