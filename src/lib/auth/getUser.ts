import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'manager' | 'employee'

export interface CurrentUser {
  id: number
  name: string
  position: string
  role: UserRole
  phone: string
  email: string
  department_id: number | null
  is_sample: boolean
}

const SAMPLE_USER: CurrentUser = {
  id: 0,
  name: '데모 사용자',
  position: '관리자',
  role: 'admin',
  phone: '',
  email: '',
  department_id: 1,
  is_sample: true,
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()

  // 1. 샘플 모드 우선 — 네트워크 호출 없이 즉시 반환
  if (cookieStore.get('kog_demo')?.value === '1') {
    return SAMPLE_USER
  }

  // 2. Supabase Auth 세션 확인
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) return null

  // 3. public.users 조회 — auth_user_id 또는 email로 매칭 (단일 쿼리)
  const { data } = await supabase
    .from('users')
    .select('id, name, position, role, phone, email, department_id, is_active')
    .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    position: data.position ?? '',
    role: data.role as UserRole,
    phone: data.phone ?? '',
    email: data.email ?? '',
    department_id: data.department_id ?? null,
    is_sample: false,
  }
}
