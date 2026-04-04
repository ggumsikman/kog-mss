'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, X, Loader2, CalendarDays, Building2, User,
  ChevronLeft, ChevronRight, Bell, RefreshCw, LayoutGrid, List
} from 'lucide-react'

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const WEEKDAYS = ['일','월','화','수','목','금','토']

const CAT_META: Record<string, { color: string; bg: string }> = {
  '세무':  { color: 'text-red-700',    bg: 'bg-red-100' },
  '노무':  { color: 'text-orange-700', bg: 'bg-orange-100' },
  '보험':  { color: 'text-blue-700',   bg: 'bg-blue-100' },
  '복지':  { color: 'text-pink-700',   bg: 'bg-pink-100' },
  '행정':  { color: 'text-gray-700',   bg: 'bg-gray-100' },
  '기타':  { color: 'text-gray-500',   bg: 'bg-gray-100' },
}

function DdayBadge({ days }: { days: number }) {
  if (days < 0)   return <span className="text-xs font-bold text-gray-400">지남</span>
  if (days === 0) return <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">D-Day</span>
  if (days <= 7)  return <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">D-{days}</span>
  if (days <= 30) return <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">D-{days}</span>
  return <span className="text-xs text-gray-400">D-{days}</span>
}

function RecurrenceBadge({ r }: { r: string }) {
  if (r === 'monthly') return <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">매월</span>
  if (r === 'yearly')  return <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-semibold">매년</span>
  return <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">1회</span>
}

interface Schedule {
  id: number
  title: string
  category: string
  recurrence: 'yearly' | 'monthly' | 'once'
  target_month: number
  target_day: number
  is_company_side: boolean
  is_employee_side: boolean
  description: string
  notify_days_before: number
  days_until: number
  next_date: string
}

export default function ScheduleClient({
  schedules: initSchedules,
  currentMonth,
  currentYear,
  role,
}: {
  schedules: Schedule[]
  currentMonth: number
  currentYear: number
  role: 'admin' | 'manager' | 'employee'
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const canManage = role === 'admin' || role === 'manager'

  // ── 뷰 모드 & 필터 ───────────────────────────────────────
  const [view,         setView]         = useState<'list' | 'calendar'>('list')
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterSide,   setFilterSide]   = useState<'all' | 'company' | 'employee'>('all')
  const [calMonth,     setCalMonth]     = useState(currentMonth)   // 1~12
  const [calYear,      setCalYear]      = useState(currentYear)
  const [schedules,    setSchedules]    = useState<Schedule[]>(initSchedules)

  // ── 필터 적용 ────────────────────────────────────────────
  const filtered = schedules.filter(s => {
    if (filterCat  !== 'all' && s.category !== filterCat) return false
    if (filterSide === 'company'  && !s.is_company_side)  return false
    if (filterSide === 'employee' && !s.is_employee_side) return false
    return true
  })

  // ── 월별 일정 (캘린더용) ─────────────────────────────────
  const calSchedules = schedules.filter(s => {
    if (s.recurrence === 'monthly') return true
    if (s.recurrence === 'yearly')  return s.target_month === calMonth
    if (s.recurrence === 'once')    return s.target_month === calMonth
    return false
  })

  // ── 등록 폼 ─────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: '세무',
    recurrence: 'yearly' as 'yearly' | 'monthly' | 'once',
    target_month: currentMonth,
    target_day: 1,
    is_company_side: true,
    is_employee_side: false,
    description: '',
    notify_days_before: 14,
  })
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function addSchedule() {
    if (!form.title.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('annual_schedules')
      .insert([{ ...form, is_active: true }])
      .select()
      .single()
    setAdding(false)
    if (error) { alert('등록 실패: ' + error.message); return }

    // D-day 재계산
    const today = new Date()
    let targetDate = new Date(today.getFullYear(), (data.target_month ?? 1) - 1, data.target_day ?? 1)
    if (targetDate < today) {
      targetDate = data.recurrence === 'monthly'
        ? new Date(today.getFullYear(), today.getMonth() + 1, data.target_day ?? 1)
        : new Date(today.getFullYear() + 1, (data.target_month ?? 1) - 1, data.target_day ?? 1)
    }
    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    setSchedules(prev => [...prev, { ...data, days_until: daysUntil, next_date: targetDate.toISOString().split('T')[0] }])
    setShowForm(false)
    setForm(f => ({ ...f, title: '', description: '' }))
  }

  async function deleteSchedule(id: number) {
    if (!confirm('삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('annual_schedules').update({ is_active: false }).eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  // ── 캘린더 생성 ─────────────────────────────────────────
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay() // 0=일
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // 6주 맞추기
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const categories = ['all', '세무', '노무', '보험', '복지', '행정', '기타']

  return (
    <div className="space-y-4">

      {/* ── 컨트롤 바 ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 뷰 토글 */}
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'list' ? 'bg-[#1A2744] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <List size={13} /> 목록
          </button>
          <button onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === 'calendar' ? 'bg-[#1A2744] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutGrid size={13} /> 캘린더
          </button>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* 카테고리 필터 */}
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterCat === c ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {c === 'all' ? '전체' : c}
          </button>
        ))}

        <div className="w-px h-4 bg-gray-200" />

        {/* 회사/직원 관점 필터 */}
        {([['all','전체'],['company','회사 관점'],['employee','직원 관점']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilterSide(v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterSide === v ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {l}
          </button>
        ))}

        {canManage && (
          <div className="ml-auto">
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors">
              <Plus size={15} /> 일정 등록
            </button>
          </div>
        )}
      </div>

      {/* ── 등록 폼 ─────────────────────────────────────── */}
      {canManage && showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">연간 일정 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <input value={form.title} onChange={e => setF('title', e.target.value)}
            placeholder="일정명 *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">카테고리</label>
              <select value={form.category} onChange={e => setF('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                {['세무','노무','보험','복지','행정','기타'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">반복 주기</label>
              <select value={form.recurrence} onChange={e => setF('recurrence', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="yearly">매년</option>
                <option value="monthly">매월</option>
                <option value="once">1회성</option>
              </select>
            </div>
            {form.recurrence !== 'monthly' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">월</label>
                <select value={form.target_month} onChange={e => setF('target_month', Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">일</label>
              <select value={form.target_day} onChange={e => setF('target_day', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.is_company_side} onChange={e => setF('is_company_side', e.target.checked)} className="rounded" />
              <Building2 size={13} className="text-gray-400" /> 회사 관점
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.is_employee_side} onChange={e => setF('is_employee_side', e.target.checked)} className="rounded" />
              <User size={13} className="text-gray-400" /> 직원 관점
            </label>
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-gray-400" />
              <select value={form.notify_days_before} onChange={e => setF('notify_days_before', Number(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
                {[3,7,14,30].map(n => <option key={n} value={n}>{n}일 전 알림</option>)}
              </select>
            </div>
          </div>

          <textarea value={form.description} onChange={e => setF('description', e.target.value)}
            placeholder="내용 메모 (선택)" rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
          />

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">취소</button>
            <button onClick={addSchedule} disabled={adding || !form.title.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          목록 뷰
      ══════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="space-y-3">
          {/* 이달 임박 섹션 */}
          {(() => {
            const urgent = filtered.filter(s => s.days_until >= 0 && s.days_until <= 30)
            if (urgent.length === 0) return null
            return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs font-bold text-yellow-700 mb-3 flex items-center gap-1.5">
                  <Bell size={12} /> D-30 이내 임박 일정
                </p>
                <div className="space-y-2">
                  {urgent.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 shadow-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${CAT_META[s.category]?.bg ?? 'bg-gray-100'} ${CAT_META[s.category]?.color ?? 'text-gray-600'}`}>
                          {s.category}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 truncate">{s.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">{s.target_month}월 {s.target_day}일</span>
                        <DdayBadge days={s.days_until} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 월별 그룹 목록 */}
          {MONTHS.map((mLabel, mi) => {
            const month = mi + 1
            // 해당 월 일정 + 매월 반복
            const monthItems = filtered.filter(s =>
              s.recurrence === 'monthly' || s.target_month === month
            ).sort((a, b) => a.target_day - b.target_day)
            if (monthItems.length === 0) return null

            const isCurrentMonth = month === currentMonth
            return (
              <div key={month} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isCurrentMonth ? 'border-blue-200' : 'border-gray-100'}`}>
                <div className={`px-5 py-3 flex items-center justify-between ${isCurrentMonth ? 'bg-blue-50' : 'bg-gray-50'} border-b ${isCurrentMonth ? 'border-blue-100' : 'border-gray-100'}`}>
                  <span className={`text-sm font-black ${isCurrentMonth ? 'text-blue-700' : 'text-gray-700'}`}>
                    {mLabel}
                    {isCurrentMonth && <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">이달</span>}
                  </span>
                  <span className="text-xs text-gray-400">{monthItems.length}건</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {monthItems.map(s => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                      {/* 날짜 */}
                      <div className="w-10 flex-shrink-0 text-center">
                        {s.recurrence === 'monthly'
                          ? <span className="text-xs text-purple-600 font-bold">{s.target_day}일<br /><span className="text-gray-400 font-normal">매월</span></span>
                          : <span className="text-sm font-bold text-gray-600">{s.target_day}<span className="text-xs font-normal text-gray-400">일</span></span>
                        }
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${CAT_META[s.category]?.bg ?? 'bg-gray-100'} ${CAT_META[s.category]?.color ?? 'text-gray-600'}`}>
                            {s.category}
                          </span>
                          <RecurrenceBadge r={s.recurrence} />
                          {s.is_company_side  && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Building2 size={10} />회사</span>}
                          {s.is_employee_side && <span className="text-xs text-gray-400 flex items-center gap-0.5"><User size={10} />직원</span>}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{s.title}</p>
                        {s.description && <p className="text-xs text-gray-400 truncate">{s.description}</p>}
                      </div>

                      {/* D-day + 삭제 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.target_month === currentMonth || s.recurrence === 'monthly'
                          ? <DdayBadge days={s.days_until} />
                          : null
                        }
                        {canManage && (
                          <button
                            onClick={() => deleteSchedule(s.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1.5 py-0.5 rounded"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 text-center py-14">
              <CalendarDays size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">등록된 일정이 없습니다</p>
              <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-blue-500 hover:underline">+ 일정 등록하기</button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          캘린더 뷰
      ══════════════════════════════════════════════════ */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronLeft size={18} />
            </button>
            <h3 className="text-base font-black text-gray-800">{calYear}년 {MONTHS[calMonth - 1]}</h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center py-2 text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const isToday = day === new Date().getDate() && calMonth === currentMonth && calYear === currentYear
              const daySchedules = day
                ? calSchedules.filter(s => s.target_day === day)
                : []
              const colDay = idx % 7

              return (
                <div
                  key={idx}
                  className={`min-h-20 p-1.5 border-b border-r border-gray-50 ${
                    !day ? 'bg-gray-50/50' : ''
                  } ${colDay === 0 ? 'border-l-0' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday ? 'bg-blue-600 text-white' :
                        colDay === 0 ? 'text-red-500' :
                        colDay === 6 ? 'text-blue-500' :
                        'text-gray-600'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {daySchedules.slice(0, 3).map(s => (
                          <div key={s.id} className={`text-xs px-1 py-0.5 rounded truncate font-medium ${CAT_META[s.category]?.bg ?? 'bg-gray-100'} ${CAT_META[s.category]?.color ?? 'text-gray-600'}`}>
                            {s.title}
                          </div>
                        ))}
                        {daySchedules.length > 3 && (
                          <div className="text-xs text-gray-400 pl-1">+{daySchedules.length - 3}건</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-3">
            {Object.entries(CAT_META).map(([cat, meta]) => (
              <span key={cat} className="flex items-center gap-1.5 text-xs">
                <span className={`w-3 h-3 rounded ${meta.bg}`} />
                <span className={meta.color}>{cat}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
