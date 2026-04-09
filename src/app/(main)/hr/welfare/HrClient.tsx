'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Plus, X, Loader2, CheckCircle2, Circle, Trash2,
  Heart, Cake, Award, Stethoscope, FileText, Gift, Bell
} from 'lucide-react'

type EventType = '건강검진' | '생일' | '근속포상' | '복지혜택' | '계약만료'
type EventStatus = '대기' | '완료' | '누락'

const TYPE_META: Record<EventType, { icon: React.ReactNode; color: string; bg: string }> = {
  '건강검진': { icon: <Stethoscope size={13} />, color: 'text-blue-700',   bg: 'bg-blue-100' },
  '생일':     { icon: <Cake size={13} />,         color: 'text-pink-700',   bg: 'bg-pink-100' },
  '근속포상': { icon: <Award size={13} />,        color: 'text-yellow-700', bg: 'bg-yellow-100' },
  '복지혜택': { icon: <Gift size={13} />,         color: 'text-green-700',  bg: 'bg-green-100' },
  '계약만료': { icon: <FileText size={13} />,     color: 'text-red-700',    bg: 'bg-red-100' },
}

function DdayBadge({ days, status }: { days: number; status: string }) {
  if (status === '완료') return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">완료</span>
  if (status === '누락') return <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">누락</span>
  if (days < 0)   return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">⚠ {Math.abs(days)}일 초과</span>
  if (days === 0) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">D-Day</span>
  if (days <= 7)  return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">D-{days}</span>
  if (days <= 30) return <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">D-{days}</span>
  return <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">D-{days}</span>
}

interface HrEvent {
  id: number
  user_id: number
  event_type: EventType
  due_date: string
  status: EventStatus
  note: string
  days_until: number
  users?: any
}

interface User { id: number; name: string; position: string; joined_at: string; department_id: number; departments?: any }
interface Department { id: number; name: string }

export default function HrClient({
  events: initEvents,
  users,
  departments,
  today,
  role,
  isSample,
}: {
  events: HrEvent[]
  users: User[]
  departments: Department[]
  today: string
  role: 'admin' | 'manager' | 'employee'
  isSample?: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const canManage = isSample || role === 'admin' || role === 'manager'
  const [events, setEvents] = useState<HrEvent[]>(initEvents)

  // ── 필터 ─────────────────────────────────────────────────
  const [filterType,   setFilterType]   = useState<EventType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all')
  const [filterDept,   setFilterDept]   = useState<number | 'all'>('all')

  const filtered = events.filter(e => {
    if (filterType   !== 'all' && e.event_type !== filterType) return false
    if (filterStatus !== 'all' && e.status     !== filterStatus) return false
    if (filterDept   !== 'all') {
      const deptId = e.users?.department_id ?? e.users?.departments?.id
      if (deptId !== filterDept) return false
    }
    return true
  })

  // ── 상태 토글 ────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<number | null>(null)

  async function toggleStatus(ev: HrEvent) {
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    setTogglingId(ev.id)
    const supabase = createClient()
    const next: EventStatus = ev.status === '완료' ? '대기' : '완료'
    const { error } = await supabase
      .from('hr_events')
      .update({ status: next, notified_at: next === '완료' ? new Date().toISOString() : null })
      .eq('id', ev.id)
    setTogglingId(null)
    if (error) { alert('업데이트 실패: ' + error.message); return }
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: next } : e))
  }

  // ── 삭제 ────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function deleteEvent(id: number) {
    if (!confirm('삭제하시겠습니까?')) return
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('hr_events').delete().eq('id', id)
    setDeletingId(null)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  // ── 등록 폼 ─────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [form, setForm] = useState({
    user_id:    users[0]?.id ?? 1,
    event_type: '건강검진' as EventType,
    due_date:   '',
    note:       '',
  })
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function addEvent() {
    if (!form.due_date) return
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('hr_events')
      .insert([{ ...form, status: '대기' }])
      .select('*, users(id, name, position, joined_at, department_id, departments(name))')
      .single()
    setAdding(false)
    if (error) { alert('등록 실패: ' + error.message); return }
    const diff = Math.ceil((new Date(data.due_date).getTime() - new Date(today).getTime()) / 86400000)
    setEvents(prev => [...prev, { ...data, days_until: diff }].sort((a, b) =>
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    ))
    setShowForm(false)
    setForm(f => ({ ...f, due_date: '', note: '' }))
  }

  // ── 근속년수 계산 ────────────────────────────────────────
  function calcTenure(joinedAt: string) {
    if (!joinedAt) return null
    const years = Math.floor((new Date().getTime() - new Date(joinedAt).getTime()) / (365.25 * 86400000))
    return years
  }

  // ── 이달 임박 섹션 데이터 ────────────────────────────────
  const urgent = events.filter(e => e.days_until >= 0 && e.days_until <= 30 && e.status === '대기')
  const overdue = events.filter(e => e.days_until < 0 && e.status === '대기')

  const EVENT_TYPES: EventType[] = ['건강검진', '생일', '근속포상', '복지혜택', '계약만료']

  return (
    <div className="space-y-4">

      {/* ── 임박/누락 알림 카드 ──────────────────────────── */}
      {(urgent.length > 0 || overdue.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {urgent.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-bold text-yellow-700 mb-3 flex items-center gap-1.5">
                <Bell size={12} /> D-30 이내 챙김 필요
              </p>
              <div className="space-y-2">
                {urgent.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_META[e.event_type].bg} ${TYPE_META[e.event_type].color}`}>
                        {TYPE_META[e.event_type].icon} {e.event_type}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{e.users?.name}</span>
                      <span className="text-xs text-gray-400">{e.users?.departments?.name}</span>
                    </div>
                    <DdayBadge days={e.days_until} status={e.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-600 mb-3 flex items-center gap-1.5">
                <X size={12} /> 기한 초과 — 즉시 확인
              </p>
              <div className="space-y-2">
                {overdue.map(e => (
                  <div key={e.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm border border-red-100">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_META[e.event_type].bg} ${TYPE_META[e.event_type].color}`}>
                        {TYPE_META[e.event_type].icon} {e.event_type}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{e.users?.name}</span>
                    </div>
                    <DdayBadge days={e.days_until} status={e.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 필터 + 등록 ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['all', ...EVENT_TYPES] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t as any)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterType === t ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {t === 'all' ? '전체 유형' : t}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-200" />
        {(['all', '대기', '완료', '누락'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {s === 'all' ? '전체 상태' : s}
          </button>
        ))}
        <select value={filterDept} onChange={e => setFilterDept(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none bg-white text-gray-600">
          <option value="all">전체 부서</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {canManage && (
          <div className="ml-auto">
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors">
              <Plus size={15} /> 이벤트 등록
            </button>
          </div>
        )}
      </div>

      {/* ── 등록 폼 ─────────────────────────────────────── */}
      {canManage && showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">인사·복지 이벤트 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          {/* 이벤트 유형 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">이벤트 유형</p>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(t => (
                <button key={t} onClick={() => setF('event_type', t)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    form.event_type === t
                      ? `${TYPE_META[t].bg} ${TYPE_META[t].color} border-current`
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}>
                  {TYPE_META[t].icon} {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">대상 직원 *</label>
              <select value={form.user_id} onChange={e => setF('user_id', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">일정 날짜 *</label>
              <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
          </div>

          <input value={form.note} onChange={e => setF('note', e.target.value)}
            placeholder="메모 (선택) — 예: 건강검진 예약 완료, 포상 종류 등"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">취소</button>
            <button onClick={addEvent} disabled={adding || !form.due_date}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* ── 이벤트 목록 ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <Heart size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">등록된 이벤트가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-blue-500 hover:underline">+ 이벤트 등록하기</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(ev => {
              const isDone    = ev.status === '완료'
              const isOverdue = ev.days_until < 0 && ev.status === '대기'
              const tenure    = calcTenure(ev.users?.joined_at)
              const deptName  = Array.isArray(ev.users?.departments) ? ev.users.departments[0]?.name : ev.users?.departments?.name

              return (
                <div key={ev.id}
                  className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group ${
                    isOverdue ? 'bg-red-50/30' : isDone ? 'bg-green-50/20' : ''
                  }`}>

                  {/* 완료 토글 */}
                  <button onClick={() => canManage && toggleStatus(ev)} disabled={togglingId === ev.id || !canManage}
                    className="flex-shrink-0 transition-colors disabled:opacity-50">
                    {togglingId === ev.id
                      ? <Loader2 size={22} className="animate-spin text-gray-400" />
                      : isDone
                        ? <CheckCircle2 size={22} className="text-green-500" />
                        : <Circle size={22} className="text-gray-300 hover:text-green-400" />
                    }
                  </button>

                  {/* 직원 아바타 */}
                  <div className={`w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-400' : isOverdue ? 'bg-red-400' : 'bg-[#1A2744]'}`}>
                    {ev.users?.name?.[0]}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_META[ev.event_type].bg} ${TYPE_META[ev.event_type].color}`}>
                        {TYPE_META[ev.event_type].icon} {ev.event_type}
                      </span>
                      <span className={`text-sm font-bold ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {ev.users?.name}
                      </span>
                      <span className="text-xs text-gray-400">{deptName} · {ev.users?.position}</span>
                      {tenure !== null && (
                        <span className="text-xs text-gray-400">입사 {tenure}년차</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatDate(ev.due_date)}</span>
                      {ev.note && <span className="truncate max-w-48 text-gray-500">{ev.note}</span>}
                    </div>
                  </div>

                  {/* D-day + 삭제 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DdayBadge days={ev.days_until} status={ev.status} />
                    {canManage && (
                      <button onClick={() => deleteEvent(ev.id)} disabled={deletingId === ev.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                        {deletingId === ev.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 직원 현황 요약 ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-sm text-gray-800 mb-4">직원 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {departments.map(dept => {
            const deptUsers = users.filter(u => u.department_id === dept.id)
            return (
              <div key={dept.id} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{dept.name}</p>
                <p className="text-2xl font-black text-[#1A2744]">{deptUsers.length}</p>
                <p className="text-xs text-gray-400">명</p>
              </div>
            )
          })}
        </div>

        <div className="mt-4 divide-y divide-gray-50">
          {users.map(u => {
            const tenure = calcTenure(u.joined_at)
            const deptName = Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name
            const userEvents = events.filter(e => e.user_id === u.id && e.status === '대기' && e.days_until >= 0 && e.days_until <= 30)
            return (
              <div key={u.id} className="flex items-center gap-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1A2744] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{u.name}
                    <span className="ml-2 text-xs text-gray-400 font-normal">{deptName} · {u.position}</span>
                  </p>
                  {u.joined_at && <p className="text-xs text-gray-400">입사 {tenure}년차 · {formatDate(u.joined_at)} 입사</p>}
                </div>
                {userEvents.length > 0 && (
                  <div className="flex gap-1 flex-shrink-0">
                    {userEvents.map(e => (
                      <span key={e.id} className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_META[e.event_type].bg} ${TYPE_META[e.event_type].color}`}>
                        {TYPE_META[e.event_type].icon}
                        <span>D-{e.days_until}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
