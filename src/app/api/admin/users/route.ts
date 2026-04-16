import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

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

// 사용자 생성
export async function POST(request: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const plainPassword = body.password || '0000'
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  const { data, error } = await supabase.from('users').insert([{
    name:          body.name,
    phone:         body.phone || null,
    email:         body.email || null,
    password_hash: hashedPassword,
    position:      body.position || null,
    role:          body.role || 'employee',
    department_id: body.department_id ? parseInt(body.department_id) : null,
    is_active:     true,
    joined_at:     body.joined_at || null,
  }]).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data })
}
