import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { calcDelayDays, calcDaysUntil, formatDate, getStatusColor } from '@/lib/utils'
import { Project, Inspection, HrEvent, AnnualSchedule } from '@/types'
import {
  AlertTriangle, Bell, ChevronRight, ShieldCheck, FileWarning
} from 'lucide-react'
import {
  SAMPLE_DELAYED_PROJECTS,
  SAMPLE_URGENT_INSPECTIONS,
  SAMPLE_PENDING_DOCS,
  SAMPLE_THIS_MONTH_EDUCATIONS,
  SAMPLE_DEPT_STATS,
} from '@/lib/sample-data'

// ── 헬퍼 컴포넌트 ──────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label: string; value: number; sub?: string; color: 'red' | 'yellow' | 'blue' | 'green'
}) {
  const colors = {
    red:    'border-red-400 bg-red-50',
    yellow: 'border-yellow-400 bg-yellow-50',
    blue:   'border-blue-400 bg-blue-50',
    green:  'border-green-400 bg-green-50',
  }
  const textColors = {
    red: 'text-red-600', yellow: 'text-yellow-700', blue: 'text-blue-600', green: 'text-green-600'
  }
  return (
    <div className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${colors[color]}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${textColors[color]}`}>{value}<span className="text-base font-semibold ml-1">건</span></p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function DelayBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
      <AlertTriangle size={10} />
      +{days}일 초과
    </span>
  )
}

function DdayBadge({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">만료 {Math.abs(days)}일</span>
  if (days === 0) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">D-Day</span>
  if (days <= 7)  return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">D-{days}</span>
  if (days <= 30) return <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">D-{days}</span>
  return <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">D-{days}</span>
}

function SectionCard({ title, children, href }: { title: string; children: React.ReactNode; href?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-sm text-gray-800">{title}</h2>
        {href && (
          <a href={href} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-0.5 transition-colors">
            전체보기 <ChevronRight size={12} />
          </a>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── 메인 대시보드 페이지 ──────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false
  const today = new Date().toISOString().split('T')[0]

  let delayed: any[]
  let inspections: any[]
  let docs: any[]
  let notifs: any[]
  let deptStats: Record<string, { name: string; total: number; done: number }>
  let educations: any[]

  if (isSample) {
    delayed = SAMPLE_DELAYED_PROJECTS
    inspections = SAMPLE_URGENT_INSPECTIONS
    docs = SAMPLE_PENDING_DOCS
    notifs = []
    deptStats = SAMPLE_DEPT_STATS
    educations = SAMPLE_THIS_MONTH_EDUCATIONS
  } else {
    // 1. 지연 프로젝트
    const { data: delayedProjects } = await supabase
      .from('projects')
      .select('*, departments(name), users(name)')
      .lt('due_date', today)
      .neq('status', '완료')
      .order('due_date', { ascending: true })

    // 2. 이달 임박 정기검사 (D-30 이내)
    const d30 = new Date(); d30.setDate(d30.getDate() + 30)
    const { data: urgentInspections } = await supabase
      .from('inspections')
      .select('*, departments(name)')
      .lte('next_due_date', d30.toISOString().split('T')[0])
      .neq('status', '정상')
      .order('next_due_date', { ascending: true })

    // 3. 이달 교육 예정
    const monthStart = today.slice(0, 7) + '-01'
    const monthEnd   = today.slice(0, 7) + '-31'
    const { data: educationsData } = await supabase
      .from('education_schedules')
      .select('*')
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd)
      .eq('status', '예정')

    // 4. 미처리 공문서
    const { data: pendingDocs } = await supabase
      .from('official_documents')
      .select('*, users!received_by(name), departments(name)')
      .in('status', ['접수', '처리중'])
      .order('received_date', { ascending: true })

    // 5. 전체 알림
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // 6. 부서별 업무달성률 (이달)
    const { data: workLogs } = await supabase
      .from('work_logs')
      .select('achieved, users(department_id, departments(name))')
      .gte('log_date', monthStart)
      .lte('log_date', monthEnd)

    // 부서별 달성률 계산
    deptStats = {}
    workLogs?.forEach((log: any) => {
      const deptId = log.users?.department_id
      const deptName = log.users?.departments?.name || '미분류'
      if (!deptId) return
      if (!deptStats[deptId]) deptStats[deptId] = { name: deptName, total: 0, done: 0 }
      deptStats[deptId].total++
      if (log.achieved) deptStats[deptId].done++
    })

    delayed = delayedProjects || []
    inspections = urgentInspections || []
    docs = pendingDocs || []
    notifs = notifications || []
    educations = educationsData || []
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">메인 대시보드</h1>
          <p className="text-sm text-gray-400 mt-0.5">{new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Bell size={16} />
          <span>미읽은 알림 <strong className="text-red-600">{notifs.length}</strong>건</span>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="🔴 지연 프로젝트" value={delayed.length} sub="즉시 조치 필요" color="red" />
        <KpiCard label="🟡 이달 검사 임박" value={inspections.length} sub="D-30 이내" color="yellow" />
        <KpiCard label="📚 이달 교육 예정" value={educations.length} sub={`${today.slice(0,7)} 기준`} color="blue" />
        <KpiCard label="📄 미처리 공문서" value={docs.length} sub="접수·처리중" color={docs.length > 0 ? 'yellow' : 'green'} />
      </div>

      {/* 메인 2컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* 지연 프로젝트 */}
        <SectionCard title="🔴 프로젝트 지연 현황" href="/projects?status=지연">
          {delayed.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">지연된 프로젝트가 없습니다 ✓</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {delayed.map((p: any) => {
                const delay = calcDelayDays(p.due_date)
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-red-50/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{p.departments?.name}</span>
                        <span className="text-xs font-medium text-gray-500">{p.category}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">담당: {p.users?.name} · 마감 {formatDate(p.due_date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <DelayBadge days={delay} />
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-red-400"
                          style={{ width: `${p.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{p.progress_pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* 이달 주요 챙김 일정 */}
        <SectionCard title="📅 이달 주요 챙김 일정" href="/schedule">
          <div className="divide-y divide-gray-50">
            {inspections.length === 0 && docs.length === 0 && (notifs.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-8">이달 임박 일정이 없습니다</p>
            )}
            {inspections.map((ins: any) => {
              const days = calcDaysUntil(ins.next_due_date)
              return (
                <div key={`ins-${ins.id}`} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheckIcon />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ins.title}</p>
                      <p className="text-xs text-gray-400">{ins.departments?.name} · {formatDate(ins.next_due_date)}</p>
                    </div>
                  </div>
                  <DdayBadge days={days} />
                </div>
              )
            })}
            {docs.filter((d: any) => {
              const received = new Date(d.received_date)
              const diff = Math.floor((new Date().getTime() - received.getTime()) / 86400000)
              return diff >= 3
            }).map((d: any) => (
              <div key={`doc-${d.id}`} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <DocIcon />
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-48">{d.title}</p>
                    <p className="text-xs text-gray-400">{d.departments?.name} · 접수 {formatDate(d.received_date)}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">미처리</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* 하단 2컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 부서별 업무 달성률 */}
        <SectionCard title="📊 부서별 이달 업무 달성률" href="/worklogs">
          <div className="px-5 py-4 space-y-4">
            {Object.values(deptStats).length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">이달 업무일지 데이터가 없습니다</p>
            ) : (
              Object.values(deptStats).map(({ name, total, done }) => {
                const pct = total > 0 ? Math.round(done / total * 100) : 0
                const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{name}</span>
                      <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {pct}%
                        {pct < 60 && <span className="ml-1 text-xs">⚠</span>}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">완료 {done} / 전체 {total}건</p>
                  </div>
                )
              })
            )}
          </div>
        </SectionCard>

        {/* 최근 알림 */}
        <SectionCard title="🔔 최근 알림" href="/notifications">
          <div className="divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">새 알림이 없습니다</p>
            ) : (
              notifs.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                    n.priority === 'high' ? 'bg-red-100 text-red-600' :
                    n.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {n.priority === 'high' ? '긴급' : n.priority === 'medium' ? '주의' : '참고'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

// 아이콘 헬퍼
function ShieldCheckIcon() {
  return <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><ShieldCheck size={14} className="text-red-500" /></div>
}
function DocIcon() {
  return <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0"><FileWarning size={14} className="text-orange-500" /></div>
}

