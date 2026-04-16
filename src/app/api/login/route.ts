import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { name, password } = await req.json()

  if (!name || !password) {
    return NextResponse.json({ error: '이름과 비밀번호를 입력해주세요.' }, { status: 400 })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, position, role, phone, email, password_hash, is_active')
    .eq('name', name.trim())
    .eq('is_active', true)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: '등록되지 않은 이름입니다.' }, { status: 401 })
  }

  // 비밀번호 검증 (bcrypt 해시 또는 기존 평문 마이그레이션)
  const stored = user.password_hash ?? ''
  const isBcrypt = stored.startsWith('$2')
  let passwordValid = false

  if (isBcrypt) {
    passwordValid = await bcrypt.compare(password, stored)
  } else {
    // 평문 비밀번호 마이그레이션: 일치하면 해싱 후 DB 업데이트
    passwordValid = stored === password
    if (passwordValid) {
      const hashed = await bcrypt.hash(password, 10)
      await supabase.from('users').update({ password_hash: hashed }).eq('id', user.id)
    }
  }

  if (!passwordValid) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  // 로그인 성공 → 쿠키에 user_id 저장
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, position: user.position } })
  res.cookies.set('kog_user_id', String(user.id), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7일
    httpOnly: true,
    sameSite: 'lax',
  })
  return res
}
