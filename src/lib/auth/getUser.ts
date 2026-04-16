import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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

  // 샘플 모드
  if (cookieStore.get('kog_demo')?.value === '1') {
    return SAMPLE_USER
  }

  // 실제 로그인
  const userId = cookieStore.get('kog_user_id')?.value
  if (!userId) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('users')
    .select('id, name, position, role, phone, email, department_id')
    .eq('id', parseInt(userId))
    .eq('is_active', true)
    .single()

  if (!data) return null

  return {
    ...data,
    is_sample: false,
  }
}
