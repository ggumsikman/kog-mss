import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'manager' | 'employee'

export interface CurrentUser {
  id: number
  name: string
  position: string
  role: UserRole
  department_id: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  departments?: any
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data } = await supabase
    .from('users')
    .select('id, name, position, role, department_id, departments(name)')
    .eq('auth_id', authUser.id)
    .eq('is_active', true)
    .single()

  return data ?? null
}
