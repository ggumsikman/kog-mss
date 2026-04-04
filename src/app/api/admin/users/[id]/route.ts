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

// 역할/활성화 수정
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (body.role      !== undefined) updates.role      = body.role
  if (body.is_active !== undefined) updates.is_active = body.is_active
  if (body.position  !== undefined) updates.position  = body.position

  const { data, error } = await admin.from('users').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ user: data })
}

// 비밀번호 재설정
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  // users 테이블에서 auth_id 조회
  const { data: userRow } = await admin.from('users').select('auth_id').eq('id', id).single()
  if (!userRow?.auth_id) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await admin.auth.admin.updateUserById(userRow.auth_id, { password: body.password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
