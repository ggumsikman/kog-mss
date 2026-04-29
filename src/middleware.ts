import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 미들웨어: 네트워크 호출 없이 인증 쿠키 존재 여부만 체크 (빠름)
 *
 * Supabase auth.getUser()를 호출하면 매 요청마다 200~500ms 네트워크 비용 발생.
 * 미들웨어는 가볍게 통과 검사만, 정밀 검증은 페이지의 getCurrentUser()에서 처리.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인 페이지, OAuth 콜백, API 경로는 인증 체크 없이 통과
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  // 샘플 모드는 그대로 통과
  if (request.cookies.get('kog_demo')?.value === '1') {
    return NextResponse.next()
  }

  // Supabase 인증 쿠키 존재 확인 (네트워크 호출 없음)
  const hasSupabaseAuth = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
  )

  if (!hasSupabaseAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 쿠키가 있으면 통과 — 토큰 만료/스푸핑 등은 페이지의 getCurrentUser()에서 처리
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
