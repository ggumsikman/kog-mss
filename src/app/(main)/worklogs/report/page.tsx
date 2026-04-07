import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { SAMPLE_WORK_LOGS, SAMPLE_USERS } from '@/lib/sample-data'
import { Printer, X } from 'lucide-react'
import Link from 'next/link'
import ReportPrintButton from './ReportPrintButton'

// ── 날짜 범위 계산 ────────────────────────────────────────
function getDateRange(type: string, date: string) {
  const [y, m, d] = date.split('-').map(Number)

  if (type === 'weekly') {
    const base = new Date(y, m - 1, d)
    const day  = base.getDay()
    const mon  = new Date(base); mon.setDate(d - (day === 0 ? 6 : day - 1))
    const sun  = new Date(mon);  sun.setDate(mon.getDate() + 6)
    const fmt  = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    return { start: fmt(mon), end: fmt(sun), title: '주간 업무일지 보고서' }
  }
  if (type === 'monthly') {
    const start = `${y}-${String(m).padStart(2,'0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end   = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
    return { start, end, title: '월간 업무일지 보고서' }
  }
  // daily (default)
  return { start: date, end: date, title: '업무일지 일일 보고서' }
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

function fmtPeriod(type: string, start: string, end: string) {
  if (type === 'daily') return fmtDate(start)
  if (type === 'weekly') return `${fmtDate(start)} ~ ${fmtDate(end)}`
  const [y, m] = start.split('-')
  return `${y}년 ${Number(m)}월`
}

// ── 메인 ─────────────────────────────────────────────────
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; date?: string }>
}) {
  const params     = await searchParams
  const type       = params.type ?? 'daily'
  const today      = new Date().toISOString().split('T')[0]
  const baseDate   = params.date ?? today
  const { start, end, title } = getDateRange(type, baseDate)

  const currentUser = await getCurrentUser()
  const isSample    = currentUser?.is_sample ?? false

  // ── 데이터 ───────────────────────────────────────────────
  let logs: any[]
  let users: any[]

  if (isSample) {
    // 샘플: 날짜 필터 무관하게 전체 샘플 데이터 사용
    logs = SAMPLE_WORK_LOGS.map(l => ({
      ...l,
      log_date: l.log_date,
    }))
    users = SAMPLE_USERS
  } else {
    const supabase = await createClient()
    const [{ data: logsData }, { data: usersData }] = await Promise.all([
      supabase.from('work_logs')
        .select('*, users(id, name, position)')
        .gte('log_date', start)
        .lte('log_date', end)
        .order('log_date', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('users')
        .select('id, name, position')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('name'),
    ])
    logs  = logsData  ?? []
    users = usersData ?? []
  }

  // ── 통계 계산 ─────────────────────────────────────────────
  const total     = logs.length
  const achieved  = logs.filter(l => l.achieved).length
  const pct       = total > 0 ? Math.round(achieved / total * 100) : 0
  const unachieved = total - achieved

  // 날짜별 그룹 (주간/월간용)
  const byDate = logs.reduce<Record<string, any[]>>((acc, l) => {
    const d = l.log_date
    if (!acc[d]) acc[d] = []
    acc[d].push(l)
    return acc
  }, {})
  const dates = Object.keys(byDate).sort()

  // 직원별 그룹
  const byUser = logs.reduce<Record<number, any[]>>((acc, l) => {
    const uid = l.users?.id ?? l.user_id
    if (!acc[uid]) acc[uid] = []
    acc[uid].push(l)
    return acc
  }, {})

  // 부서별 통계
  const deptStats = logs.reduce<Record<string, { name: string; total: number; done: number }>>((acc, l) => {
    const dName = l.users?.position ?? '미분류'
    if (!acc[dName]) acc[dName] = { name: dName, total: 0, done: 0 }
    acc[dName].total++
    if (l.achieved) acc[dName].done++
    return acc
  }, {})

  // 미작성자 (당일 보고서만)
  const submittedUserIds = new Set(logs.map(l => l.users?.id ?? l.user_id))
  const nonSubmitters = type === 'daily'
    ? users.filter(u => !submittedUserIds.has(u.id))
    : []

  const generatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

  const LOG_TYPE_COLOR: Record<string, string> = {
    '정기업무': '#3b82f6',
    '프로젝트': '#8b5cf6',
    '돌발업무': '#f97316',
  }

  return (
    <>
      {/* ── 화면용 헤더 (인쇄 시 숨김) ── */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-50">
        <Link href={`/worklogs${baseDate !== today ? `?date=${baseDate}` : ''}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <X size={16} />
          닫기
        </Link>
        <div className="h-4 w-px bg-gray-200" />

        {/* 보고서 유형 탭 */}
        {(['daily', 'weekly', 'monthly'] as const).map(t => (
          <Link
            key={t}
            href={`/worklogs/report?type=${t}&date=${baseDate}`}
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              type === t
                ? 'bg-[#1A2744] text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t === 'daily' ? '당일' : t === 'weekly' ? '주간' : '월간'}
          </Link>
        ))}

        <input
          type={type === 'monthly' ? 'month' : 'date'}
          defaultValue={type === 'monthly' ? baseDate.slice(0, 7) : baseDate}
          onChange={() => {}}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value
            const d = type === 'monthly' ? v + '-01' : v
            if (d) window.location.href = `/worklogs/report?type=${type}&date=${d}`
          }}
        />

        <div className="ml-auto">
          <ReportPrintButton />
        </div>
      </div>

      {/* ── 인쇄 본문 ── */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">

        {/* 회사 헤더 */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b-2 border-gray-800">
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-1">KOG International</p>
            <h1 className="text-2xl font-black text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {fmtPeriod(type, start, end)}
              {isSample && <span className="ml-2 text-xs text-amber-600 font-bold">[샘플 데이터]</span>}
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>생성일시</p>
            <p className="font-medium text-gray-600">{generatedAt}</p>
          </div>
        </div>

        {/* 요약 KPI */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '총 업무', value: total, unit: '건', color: 'text-gray-800' },
            { label: '달성', value: achieved, unit: '건', color: 'text-green-600' },
            { label: '미달성', value: unachieved, unit: '건', color: unachieved > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: '달성률', value: pct, unit: '%', color: pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}<span className="text-sm font-medium ml-0.5">{unit}</span></p>
            </div>
          ))}
        </div>

        {/* 부서별 달성률 */}
        {Object.keys(deptStats).length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">직책별 달성률</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(deptStats).map(({ name, total: dt, done }) => {
                const p = dt > 0 ? Math.round(done / dt * 100) : 0
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-16 flex-shrink-0">{name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-16 text-right ${p >= 80 ? 'text-green-600' : p >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {done}/{dt}건 ({p}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 업무 목록 — 주간/월간은 날짜별로 묶음 */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">업무 내역</h2>

          {total === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">기간 내 업무일지가 없습니다.</p>
          ) : type === 'daily' ? (
            /* 당일: 직원별 묶음 */
            <PersonGroupList byUser={byUser} users={users} logTypeColor={LOG_TYPE_COLOR} />
          ) : (
            /* 주간/월간: 날짜별 → 직원별 묶음 */
            dates.map(d => (
              <div key={d} className="mb-5 print:break-inside-avoid">
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm font-bold text-gray-800">{fmtDate(d)}</p>
                  <div className="flex-1 h-px bg-gray-200" />
                  <p className="text-xs text-gray-400">
                    {byDate[d].filter(l => l.achieved).length}/{byDate[d].length}건 달성
                  </p>
                </div>
                <PersonGroupList
                  byUser={byDate[d].reduce<Record<number, any[]>>((acc, l) => {
                    const uid = l.users?.id ?? l.user_id
                    if (!acc[uid]) acc[uid] = []
                    acc[uid].push(l)
                    return acc
                  }, {})}
                  users={users}
                  logTypeColor={LOG_TYPE_COLOR}
                />
              </div>
            ))
          )}
        </div>

        {/* 미작성자 (당일만) */}
        {type === 'daily' && nonSubmitters.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">
              미작성자 ({nonSubmitters.length}명)
            </h2>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex flex-wrap gap-3">
                {nonSubmitters.map(u => (
                  <div key={u.id} className="flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-800">{u.name}</span>
                    <span className="text-gray-500">{u.position}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 보고서 하단 서명란 (인쇄용) */}
        <div className="hidden print:block mt-10 pt-6 border-t-2 border-gray-800">
          <div className="grid grid-cols-3 gap-8 text-center">
            {['작성', '검토', '결재'].map(role => (
              <div key={role} className="border border-gray-300 rounded-lg p-4 h-20 flex flex-col justify-between">
                <p className="text-xs font-semibold text-gray-500">{role}</p>
                <div />
                <p className="text-xs text-gray-400">(인)</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

// ── 직원별 묶음 컴포넌트 ─────────────────────────────────
function PersonGroupList({
  byUser, users, logTypeColor,
}: {
  byUser: Record<number, any[]>
  users: any[]
  logTypeColor: Record<string, string>
}) {
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  return (
    <div className="space-y-3">
      {Object.entries(byUser).map(([uid, uLogs]) => {
        const user = uLogs[0]?.users ?? userMap[Number(uid)]
        const done = uLogs.filter(l => l.achieved).length

        return (
          <div key={uid} className="border border-gray-100 rounded-xl overflow-hidden print:break-inside-avoid">
            {/* 직원 헤더 */}
            <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">{user?.name}</span>
                <span className="text-xs text-gray-500">{user?.position}</span>
              </div>
              <span className={`text-xs font-bold ${done === uLogs.length ? 'text-green-600' : done > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {done}/{uLogs.length}건 달성
              </span>
            </div>

            {/* 업무 목록 */}
            <div className="divide-y divide-gray-50">
              {uLogs.map((log: any, i: number) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="mt-0.5 text-lg leading-none flex-shrink-0">
                    {log.achieved ? '✓' : '○'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span style={{ color: logTypeColor[log.log_type] ?? '#6b7280' }}
                        className="text-xs font-semibold">
                        [{log.log_type}]
                      </span>
                      {!log.is_planned && (
                        <span className="text-xs text-orange-500">[비계획]</span>
                      )}
                      <span className={`text-sm font-medium ${log.achieved ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {log.title}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">{log.description}</p>
                    )}
                    {!log.achieved && log.note && (
                      <p className="text-xs text-red-500 mt-0.5">사유: {log.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
