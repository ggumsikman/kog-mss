/**
 * Vercel Cron Job — 매일 08:00 KST (23:00 UTC 전날)
 * 업무일지 미작성자에게 이메일·SMS·카카오 알림 발송
 *
 * 환경 변수 설정 필요:
 *   CRON_SECRET           — Vercel이 자동 생성 (대시보드에서 확인)
 *   NOTIFY_START_DATE     — 알림 발송 시작일 (YYYY-MM-DD, 미설정 시 기본값: 2026-05-06)
 *                           이 날짜 이전에는 cron이 동작해도 메일이 나가지 않음
 *   RESEND_API_KEY        — 이메일 발송 (https://resend.com)
 *   NOTIFY_FROM_EMAIL     — 발신 이메일 주소 (예: noreply@kogintl.com)
 *   NEXT_PUBLIC_APP_URL   — 시스템 URL (예: https://kog-mss.vercel.app)
 *   SMS_API_KEY           — SMS 발송 API 키 (NHN Cloud / Aligo 등) — 미구현
 *   KAKAO_API_KEY         — 카카오 알림톡 API 키 (NHN Cloud BizMessage) — 미구현
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRestDay } from '@/lib/holidays'

// 기본 발송 시작일 — 환경변수로 덮어쓰기 가능
const DEFAULT_NOTIFY_START_DATE = '2026-05-06'

// GET /api/cron/notify-worklogs
export async function GET(request: NextRequest) {
  // ── 인증 ─────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 오늘 날짜 (KST) ──────────────────────────────────────
  const kstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const today  = `${kstNow.getFullYear()}-${String(kstNow.getMonth()+1).padStart(2,'0')}-${String(kstNow.getDate()).padStart(2,'0')}`

  // ── 발송 시작일 게이트 ──────────────────────────────────
  // 정식 운영 시작 전에는 cron이 동작해도 이메일을 보내지 않음
  const startDate = process.env.NOTIFY_START_DATE || DEFAULT_NOTIFY_START_DATE
  if (today < startDate) {
    return NextResponse.json({
      message: `📭 알림 발송 비활성 기간 (${today} < ${startDate})`,
      hint: '정식 운영 시작일 이후 자동 발송됩니다. 변경하려면 NOTIFY_START_DATE 환경변수 설정.',
      startDate,
      today,
    })
  }

  // ── 쉬는 날 확인 ─────────────────────────────────────────
  const { isRest, label: restLabel } = checkRestDay(today)
  const supabase = createAdminClient()

  if (isRest) {
    const { data: specialDay } = await supabase
      .from('special_workdays').select('date').eq('date', today).maybeSingle()
    if (!specialDay) {
      return NextResponse.json({ message: `${today} — ${restLabel}, 알림 발송 없음` })
    }
  }

  // ── 데이터 조회 ──────────────────────────────────────────
  const [
    { data: users },
    { data: logs },
    { data: attendances },
  ] = await Promise.all([
    supabase.from('users')
      .select('id, name, email, phone, position, departments(name)')
      .eq('is_active', true),
    supabase.from('work_logs').select('user_id').eq('log_date', today),
    supabase.from('attendance_records').select('user_id, type').eq('date', today),
  ])

  const submittedIds = new Set((logs ?? []).map((l: any) => l.user_id))
  const leaveIds = new Set(
    (attendances ?? [])
      .filter((a: any) => ['연차', '반차오전', '병가'].includes(a.type))
      .map((a: any) => a.user_id)
  )

  const nonSubmitters = (users ?? []).filter(
    (u: any) => !submittedIds.has(u.id) && !leaveIds.has(u.id)
  )

  if (nonSubmitters.length === 0) {
    return NextResponse.json({ message: '모든 직원 업무일지 작성 완료', date: today })
  }

  // ── 알림 발송 ────────────────────────────────────────────
  const results: any[] = []

  for (const user of nonSubmitters) {
    const sent = await sendAllChannels(user, today)
    results.push(sent)

    // 알림 기록 (notifications 테이블)
    await supabase.from('notifications').insert({
      source_module: 'project', // work_log 모듈이 없으면 project 사용
      ref_id: user.id,
      title: `[업무일지 미작성] ${user.name} ${user.position}`,
      message: `${today} 업무일지가 작성되지 않았습니다. 오전 8:30까지 작성해 주세요.`,
      priority: 'medium',
      target_user_id: user.id,
      is_read: false,
    })
  }

  return NextResponse.json({
    date: today,
    nonSubmitters: nonSubmitters.length,
    results,
  })
}

// ── 채널별 발송 ──────────────────────────────────────────
async function sendAllChannels(user: any, date: string) {
  const [email, sms, kakao] = await Promise.all([
    sendEmail(user, date),
    sendSms(user, date),
    sendKakao(user, date),
  ])
  return { user: `${user.name} ${user.position}`, email, sms, kakao }
}

// ── 이메일 (Resend) ─────────────────────────────────────
async function sendEmail(user: any, date: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) return '⚠ RESEND_API_KEY 미설정'
  if (!user.email) return '⚠ 이메일 없음'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL ?? 'KOG MSS <noreply@kog-mss.com>',
        to: [user.email],
        subject: `[KOG MSS] ${date} 업무일지를 작성해 주세요`,
        html: buildEmailHtml(user, date),
      }),
    })
    return res.ok ? '✓ 발송 완료' : `✗ 실패 (HTTP ${res.status})`
  } catch (e) {
    return `✗ 오류: ${e}`
  }
}

// ── SMS (NHN Cloud / Aligo 등 구현 필요) ────────────────
async function sendSms(user: any, date: string): Promise<string> {
  if (!process.env.SMS_API_KEY) return '⚠ SMS_API_KEY 미설정'
  if (!user.phone) return '⚠ 휴대폰 번호 없음'

  // TODO: 사용하는 SMS 서비스 SDK에 맞게 구현
  // 예) NHN Cloud SMS:
  // await fetch('https://api-sms.cloud.toast.com/sms/v3.0/appKeys/{appKey}/sender/sms', { ... })
  //
  // 예) Aligo:
  // await fetch('https://apis.aligo.in/send/', { ... })

  const msg = `[KOG MSS] ${user.name}님, ${date} 업무일지가 미작성입니다. 8:30까지 작성해주세요. ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kog-mss.vercel.app'}/worklogs`
  console.log('[SMS 준비]', user.phone, msg)
  return '⚠ SMS 서비스 미구현 (SMS_API_KEY 설정 후 코드 추가 필요)'
}

// ── 카카오 알림톡 (NHN Cloud BizMessage 구현 필요) ───────
async function sendKakao(user: any, date: string): Promise<string> {
  if (!process.env.KAKAO_API_KEY) return '⚠ KAKAO_API_KEY 미설정'
  if (!user.phone) return '⚠ 휴대폰 번호 없음'

  // TODO: 카카오 알림톡 템플릿을 먼저 등록한 후 구현
  // NHN Cloud BizMessage: https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/
  // 또는 직접 카카오 파트너사 API 연동

  console.log('[카카오 알림톡 준비]', user.phone, user.name, date)
  return '⚠ 카카오 알림톡 미구현 (템플릿 등록 후 KAKAO_API_KEY 설정 필요)'
}

// ── 이메일 HTML 템플릿 ────────────────────────────────────
function buildEmailHtml(user: any, date: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kog-mss.vercel.app'
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,sans-serif;">
<div style="max-width:560px;margin:32px auto;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <div style="background:#1A2744;padding:24px 28px;">
    <p style="color:rgba(255,255,255,.4);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">KOG International</p>
    <h1 style="color:#fff;font-size:18px;margin:0;">경영관리시스템</h1>
  </div>
  <div style="background:#fff;padding:28px;">
    <p style="font-size:15px;color:#111827;margin:0 0 20px;">${user.name} <span style="color:#6b7280;">${user.position}</span>님, 안녕하세요.</p>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 8px;">📋 오늘 업무일지가 아직 작성되지 않았습니다</p>
      <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">
        <strong>${date}</strong> 업무일지 마감 시간은 오전 <strong>8시 30분</strong>입니다.<br>
        마감 전까지 꼭 작성해 주시기 바랍니다.
      </p>
    </div>
    <a href="${appUrl}/worklogs" style="display:inline-block;background:#1A2744;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
      업무일지 작성하기 →
    </a>
    <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px;">
    <p style="font-size:11px;color:#9ca3af;margin:0;">이 메일은 KOG 경영관리시스템에서 자동 발송됩니다. 문의: 관리팀</p>
  </div>
</div>
</body></html>`
}
