import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function assertAdmin() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('kog_user_id')?.value
  if (!userId) return false
  const { data } = await supabase.from('users').select('role').eq('id', parseInt(userId)).single()
  return data?.role === 'admin'
}

// 역할/활성화 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.role      !== undefined) updates.role      = body.role
  if (body.is_active !== undefined) updates.is_active = body.is_active
  if (body.position  !== undefined) updates.position  = body.position

  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ user: data })
}

// 비밀번호 재설정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const { error } = await supabase
    .from('users')
    .update({ password_hash: body.password })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
