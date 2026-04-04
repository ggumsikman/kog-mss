import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
  return data?.role === 'admin' ? true : null
}

// 사용자 생성
export async function POST(request: Request) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const { data, error } = await admin.from('users').insert([{
    name:           body.name,
    email:          body.email,
    department_id:  Number(body.department_id),
    position:       body.position,
    role:           body.role,
    auth_id:        authData.user.id,
    is_active:      true,
    joined_at:      body.joined_at || new Date().toISOString().split('T')[0],
  }]).select().single()

  if (error) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data })
}
