'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarCheck, ChevronLeft, ChevronRight, Plus, X, Loader2,
  Plane, Coffee, Home, Briefcase, Stethoscope, MapPin, HelpCircle, Sun,
  Users, Filter,
} from 'lucide-react'

type AttendanceType = '연차' | '반차오전' | '반차오후' | '외근' | '출장' | '재택' | '병가' | '기타'

const TYPE_META: Record<AttendanceType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  '연차':    { label: '연차',      color: 'text-red-700',    bg: 'bg-red-100',    icon: Sun },
  '반차오전': { label: '반차(오전)', color: 'text-orange-700', bg: 'bg-orange-100', icon: Coffee },
  '반차오후': { label: '반차(오후)', color: 'text-orange-700', bg: 'bg-orange-100', icon: Coffee },
  '외근':    { label: '외근',      color: 'text-blue-700',   bg: 'bg-blue-100',   icon: MapPin },
  '출장':    { label: '출장',      color: 'text-purple-700', bg: 'bg-purple-100', icon: Plane },
  '재택':    { label: '재택',      color: 'text-teal-700',   bg: 'bg-teal-100',   icon: Home },
  '병가':    { label: '병가',      color: 'text-pink-700',   bg: 'bg-pink-100',   icon: Stethoscope },
  '기타':    { label: '기타',      color: 'text-gray-600',   bg: 'bg-gray-100',   icon: HelpCircle },
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function AttendanceClient({
  attendance: initAttendance,
  users,
  departments,
  role,
  isSample,
}: {
  attendance: any[]
  users: any[]
  departments: any[]
  role: string
  isSample: boolean
}) {
  const router = useRouter()
  const [attendance, setAttendance] = useState(initAttendance)

  // 캘린더 상태
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // 필터
  const [filterDept, setFilterDept] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<AttendanceType | '전체'>('전체')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // 등록 모달
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ user_id: 0, date: '', type: '연차' as AttendanceType, note: '' })

  // 월 이동
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // 이번 달 근태 필터링
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthAttendance = useMemo(() => {
    let filtered = attendance.filter((a: any) => a.date.startsWith(monthStr))
    if (filterDept) filtered = filtered.filter((a: any) => {
      const user = users.find((u: any) => u.id === a.user_id)
      return user?.department_id === filterDept
    })
    if (filterType !== '전체') filtered = filtered.filter((a: any) => a.type === filterType)
    return filtered
  }, [attendance, monthStr, filterDept, filterType, users])

  // 캘린더 데이터 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [year, month])

  // 날짜별 근태 맵
  const dateAttendanceMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    monthAttendance.forEach((a: any) => {
      const day = a.date.split('-')[2].replace(/^0/, '')
      if (!map[day]) map[day] = []
      map[day].push(a)
    })
    return map
  }, [monthAttendance])

  // 선택된 날짜의 근태 목록
  const selectedAttendance = useMemo(() => {
    if (!selectedDate) return []
    return attendance.filter((a: any) => a.date === selectedDate)
  }, [attendance, selectedDate])

  // 이번 달 통계
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    monthAttendance.forEach((a: any) => { counts[a.type] = (counts[a.type] || 0) + 1 })
    return counts
  }, [monthAttendance])

  // 등록
  function openForm(date?: string) {
    setForm({ user_id: users[0]?.id || 0, date: date || new Date().toISOString().split('T')[0], type: '연차', note: '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.user_id || !form.date) { alert('필수 항목을 입력하세요.'); return }
    if (isSample) { alert('샘플 모드에서는 등록할 수 없습니다.'); return }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('attendance_records')
      .upsert({ user_id: form.user_id, date: form.date, type: form.type, note: form.note }, { onConflict: 'user_id,date' })

    if (error) { alert('저장 실패: ' + error.message) }
    else {
      setShowForm(false)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (isSample) return
    if (!confirm('이 근태 기록을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('attendance_records').delete().eq('id', id)
    router.refresh()
  }

  function getUserName(userId: number) {
    const u = users.find((u: any) => u.id === userId)
    return u ? u.name : `ID:${userId}`
  }
  function getUserDept(userId: number) {
    const u = users.find((u: any) => u.id === userId)
    return u?.departments?.name || ''
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CalendarCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">근태 관리</h1>
            <p className="text-xs text-gray-500">이번 달 근태 {monthAttendance.length}건</p>
          </div>
        </div>
        {(role === 'admin' || role === 'manager') && (
          <button onClick={() => openForm()} className="flex items-center gap-1.5 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243352]">
            <Plus size={16} /> 근태 등록
          </button>
        )}
      </div>

      {/* 이번 달 통계 */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-5">
        {(Object.keys(TYPE_META) as AttendanceType[]).map(type => {
          const meta = TYPE_META[type]
          const Icon = meta.icon
          const count = stats[type] || 0
          return (
            <button key={type} onClick={() => setFilterType(filterType === type ? '전체' : type)}
              className={`rounded-xl p-2.5 text-center transition-all border ${
                filterType === type ? 'border-gray-400 shadow-sm' : 'border-transparent'
              } ${meta.bg}`}>
              <Icon size={16} className={`mx-auto mb-1 ${meta.color}`} />
              <p className={`text-xs font-bold ${meta.color}`}>{count}</p>
              <p className="text-[10px] text-gray-500">{meta.label}</p>
            </button>
          )
        })}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        <select value={filterDept ?? ''} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : null)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
          <option value="">전체 부서</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {(filterDept || filterType !== '전체') && (
          <button onClick={() => { setFilterDept(null); setFilterType('전체') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">필터 초기화</button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ===== 캘린더 ===== */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <h2 className="font-bold text-gray-900">{year}년 {month + 1}월</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-1.5 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="min-h-[72px]" />

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayOfWeek = new Date(year, month, day).getDay()
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSelected = dateStr === selectedDate
              const records = dateAttendanceMap[String(day)] || []

              return (
                <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[72px] rounded-lg p-1 text-left transition-all border ${
                    isSelected ? 'border-blue-400 bg-blue-50' :
                    isToday ? 'border-emerald-300 bg-emerald-50/50' :
                    'border-transparent hover:bg-gray-50'
                  }`}>
                  <span className={`text-xs font-semibold ${
                    isToday ? 'text-emerald-600' :
                    dayOfWeek === 0 ? 'text-red-400' :
                    dayOfWeek === 6 ? 'text-blue-400' :
                    isWeekend ? 'text-gray-300' : 'text-gray-700'
                  }`}>{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {records.slice(0, 3).map((r: any, i: number) => {
                      const meta = TYPE_META[r.type as AttendanceType] || TYPE_META['기타']
                      return (
                        <div key={i} className={`text-[9px] font-semibold truncate rounded px-1 py-0.5 ${meta.bg} ${meta.color}`}>
                          {getUserName(r.user_id).slice(0, 2)} {meta.label}
                        </div>
                      )
                    })}
                    {records.length > 3 && (
                      <div className="text-[9px] text-gray-400 px-1">+{records.length - 3}건</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ===== 사이드 패널 ===== */}
        <div className="space-y-4">
          {/* 선택된 날짜 상세 */}
          {selectedDate ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </h3>
                {(role === 'admin' || role === 'manager') && (
                  <button onClick={() => openForm(selectedDate)} className="text-xs text-blue-600 font-semibold hover:underline">+ 등록</button>
                )}
              </div>
              {selectedAttendance.length > 0 ? (
                <div className="space-y-2">
                  {selectedAttendance.map((a: any) => {
                    const meta = TYPE_META[a.type as AttendanceType] || TYPE_META['기타']
                    const Icon = meta.icon
                    return (
                      <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-gray-900">{getUserName(a.user_id)}</span>
                            <span className="text-[10px] text-gray-400">{getUserDept(a.user_id)}</span>
                          </div>
                          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                          {a.note && <p className="text-xs text-gray-500 mt-0.5">{a.note}</p>}
                        </div>
                        {(role === 'admin' || role === 'manager') && !isSample && (
                          <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">이 날짜에 근태 기록이 없습니다</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center py-8">
              <CalendarCheck size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">날짜를 클릭하면<br/>상세 근태를 확인할 수 있습니다</p>
            </div>
          )}

          {/* 이번 달 직원별 요약 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" /> 직원별 이번 달 현황
            </h3>
            <div className="space-y-2">
              {users.filter((u: any) => !filterDept || u.department_id === filterDept).map((user: any) => {
                const userAtt = monthAttendance.filter((a: any) => a.user_id === user.id)
                if (userAtt.length === 0) return null
                return (
                  <div key={user.id} className="flex items-center gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                      {user.name?.slice(0, 1)}
                    </div>
                    <span className="font-semibold text-gray-800 w-14 shrink-0">{user.name}</span>
                    <div className="flex gap-1 flex-wrap flex-1">
                      {userAtt.map((a: any, i: number) => {
                        const meta = TYPE_META[a.type as AttendanceType] || TYPE_META['기타']
                        return (
                          <span key={i} className={`${meta.bg} ${meta.color} text-[10px] font-semibold px-1.5 py-0.5 rounded`}>
                            {meta.label}
                          </span>
                        )
                      })}
                    </div>
                    <span className="text-gray-400 shrink-0">{userAtt.length}건</span>
                  </div>
                )
              }).filter(Boolean)}
              {users.filter((u: any) => !filterDept || u.department_id === filterDept)
                .every((u: any) => monthAttendance.filter((a: any) => a.user_id === u.id).length === 0) && (
                <p className="text-xs text-gray-400 text-center py-2">이번 달 근태 기록이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 등록 모달 ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h3 className="font-bold text-gray-900 mb-4">근태 등록</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">직원 *</label>
                <select value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.position})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">날짜 *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">유형 *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(TYPE_META) as AttendanceType[]).map(type => {
                    const meta = TYPE_META[type]
                    const Icon = meta.icon
                    return (
                      <button key={type} type="button" onClick={() => setForm(p => ({ ...p, type }))}
                        className={`rounded-lg p-2 text-center transition-all border ${
                          form.type === type ? `${meta.bg} border-current ${meta.color}` : 'bg-white border-gray-200 text-gray-400'
                        }`}>
                        <Icon size={14} className="mx-auto mb-0.5" />
                        <span className="text-[10px] font-semibold">{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">비고</label>
                <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="사유를 입력하세요" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-[#1A2744] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-[#243352] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
