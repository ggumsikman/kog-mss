import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('kog_user_id')?.value
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, { status: 400 })
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 })
  }

  // 현재 비밀번호 확인
  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', parseInt(userId))
    .single()

  if (!user) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  const stored = user.password_hash ?? ''
  const isBcrypt = stored.startsWith('$2')
  const passwordValid = isBcrypt
    ? await bcrypt.compare(currentPassword, stored)
    : stored === currentPassword

  if (!passwordValid) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  // 새 비밀번호 해싱 후 저장
  const hashed = await bcrypt.hash(newPassword, 10)
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hashed })
    .eq('id', parseInt(userId))

  if (error) {
    return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
