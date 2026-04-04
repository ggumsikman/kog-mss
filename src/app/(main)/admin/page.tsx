import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { notFound } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'admin') notFound()

  const supabase = await createClient()
  const [{ data: users }, { data: departments }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, position, role, is_active, joined_at, auth_id, departments(name)')
      .order('name'),
    supabase.from('departments').select('id, name').order('name'),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900">사용자 관리</h1>
        <p className="text-sm text-gray-400 mt-0.5">계정 생성 및 역할 관리 (관리자 전용)</p>
      </div>
      <AdminClient users={users ?? []} departments={departments ?? []} />
    </div>
  )
}
