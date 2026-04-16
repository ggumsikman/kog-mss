'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkRestDay } from '@/lib/holidays'
import {
  CalendarCheck, ChevronLeft, ChevronRight, Plus, X, Loader2,
  Plane, Coffee, Home, Briefcase, Stethoscope, MapPin, HelpCircle, Sun,
  Users, Filter, Check, XCircle, Clock, AlertTriangle,
} from 'lucide-react'

type AttendanceType = '연차' | '반차오전' | '반차오후' | '외근' | '출장' | '재택' | '병가' | '기타'
type AttendanceStatus = '대기' | '승인' | '반려'

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

const STATUS_STYLE: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  '대기': { label: '대기', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  '승인': { label: '승인', color: 'text-green-700', bg: 'bg-green-100', icon: Check },
  '반려': { label: '반려', color: 'text-red-700',   bg: 'bg-red-100',   icon: XCircle },
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const LEAVE_TYPES: AttendanceType[] = ['연차', '반차오전', '반차오후']

export default function AttendanceClient({
  attendance: initAttendance,
  users,
  departments,
  leaveQuotas,
  role,
  isSample,
  currentUserId,
}: {
  attendance: any[]
  users: any[]
  departments: any[]
  leaveQuotas: any[]
  role: string
  isSample: boolean
  currentUserId: number
}) {
  const router = useRouter()
  const [attendance, setAttendance] = useState(initAttendance)
  const canManage = role === 'admin' || role === 'manager'

  // 캘린더 상태
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // 필터
  const [filterDept, setFilterDept] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<AttendanceType | '전체'>('전체')
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | '전체'>('전체')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // 등록 모달
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dateRange, setDateRange] = useState(false)
  const [form, setForm] = useState({
    user_id: 0, date: '', dateTo: '', type: '연차' as AttendanceType, note: '',
  })

  // 반려 모달
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // 월 이동
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  // 연차 사용일수 계산
  function getLeaveUsed(userId: number): number {
    return attendance.filter((a: any) =>
      a.user_id === userId &&
      a.type === '연차' &&
      (a.status === '승인' || a.status === '대기') &&
      a.date.startsWith(String(year))
    ).length
  }
  function getLeaveQuota(userId: number) {
    return leaveQuotas.find((q: any) => q.user_id === userId)
  }

  // 다일 등록 시 평일 날짜 계산
  function getWorkdays(from: string, to: string): string[] {
    const dates: string[] = []
    const start = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0]
      const { isRest } = checkRestDay(ds)
      if (!isRest) dates.push(ds)
    }
    return dates
  }

  // 이번 달 근태 필터링
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthAttendance = useMemo(() => {
    let filtered = attendance.filter((a: any) => a.date.startsWith(monthStr))
    // staff는 본인 근태만 표시
    if (!canManage) filtered = filtered.filter((a: any) => a.user_id === currentUserId)
    if (filterDept) filtered = filtered.filter((a: any) => {
      const user = users.find((u: any) => u.id === a.user_id)
      return user?.department_id === filterDept
    })
    if (filterType !== '전체') filtered = filtered.filter((a: any) => a.type === filterType)
    if (filterStatus !== '전체') filtered = filtered.filter((a: any) => (a.status || '승인') === filterStatus)
    return filtered
  }, [attendance, monthStr, filterDept, filterType, filterStatus, users, canManage, currentUserId])

  // 대기 건수
  const pendingCount = useMemo(() =>
    attendance.filter((a: any) => (a.status || '승인') === '대기' && a.date.startsWith(monthStr)).length
  , [attendance, monthStr])

  // 캘린더 데이터
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [year, month])

  const dateAttendanceMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    monthAttendance.forEach((a: any) => {
      const day = a.date.split('-')[2].replace(/^0/, '')
      if (!map[day]) map[day] = []
      map[day].push(a)
    })
    return map
  }, [monthAttendance])

  const selectedAttendance = useMemo(() => {
    if (!selectedDate) return []
    let filtered = attendance.filter((a: any) => a.date === selectedDate)
    if (!canManage) filtered = filtered.filter((a: any) => a.user_id === currentUserId)
    return filtered
  }, [attendance, selectedDate, canManage, currentUserId])

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    monthAttendance.forEach((a: any) => { counts[a.type] = (counts[a.type] || 0) + 1 })
    return counts
  }, [monthAttendance])

  // 등록 폼 열기
  function openForm(date?: string) {
    const defaultUser = canManage ? (users[0]?.id || 0) : currentUserId
    setForm({
      user_id: defaultUser,
      date: date || new Date().toISOString().split('T')[0],
      dateTo: '',
      type: '연차',
      note: '',
    })
    setDateRange(false)
    setShowForm(true)
  }

  // 저장
  async function handleSave() {
    if (!form.user_id || !form.date) { alert('필수 항목을 입력하세요.'); return }
    if (isSample) {
      // 샘플 모드: 로컬 상태에만 추가
      const status = canManage ? '승인' : '대기'
      if (dateRange && form.dateTo) {
        const workdays = getWorkdays(form.date, form.dateTo)
        const newRecords = workdays.map((d, i) => ({
          id: Date.now() + i,
          user_id: form.user_id,
          date: d,
          type: form.type,
          note: form.note,
          status,
          approver_id: canManage ? currentUserId : null,
          approved_at: canManage ? new Date().toISOString() : null,
        }))
        setAttendance(prev => [...prev, ...newRecords])
      } else {
        setAttendance(prev => [...prev, {
          id: Date.now(),
          user_id: form.user_id,
          date: form.date,
          type: form.type,
          note: form.note,
          status,
          approver_id: canManage ? currentUserId : null,
          approved_at: canManage ? new Date().toISOString() : null,
        }])
      }
      setShowForm(false)
      return
    }

    // 연차 잔여 확인
    if (LEAVE_TYPES.includes(form.type)) {
      const quota = getLeaveQuota(form.user_id)
      const used = getLeaveUsed(form.user_id)
      const daysToAdd = dateRange && form.dateTo ? getWorkdays(form.date, form.dateTo).length : 1
      const halfDay = form.type.startsWith('반차') ? 0.5 : 1
      const totalUse = used + (daysToAdd * halfDay)
      if (quota && totalUse > quota.total_days) {
        if (!confirm(`연차 잔여일수를 초과합니다 (${used}/${quota.total_days}일 사용, 추가 ${daysToAdd * halfDay}일). 계속하시겠습니까?`)) return
      }
    }

    setSaving(true)
    const supabase = createClient()
    const status = canManage ? '승인' : '대기'
    const approverFields = canManage ? { approver_id: currentUserId, approved_at: new Date().toISOString() } : {}

    if (dateRange && form.dateTo) {
      const workdays = getWorkdays(form.date, form.dateTo)
      if (workdays.length === 0) { alert('선택한 기간에 평일이 없습니다.'); setSaving(false); return }
      if (!confirm(`${form.date} ~ ${form.dateTo}, 총 ${workdays.length}일 (공휴일/주말 제외) 등록하시겠습니까?`)) { setSaving(false); return }

      const records = workdays.map(d => ({
        user_id: form.user_id, date: d, type: form.type, note: form.note, status, ...approverFields,
      }))
      const { error } = await supabase.from('attendance_records').upsert(records, { onConflict: 'user_id,date' })
      if (error) { alert('저장 실패: ' + error.message) }
      else { setShowForm(false); router.refresh() }
    } else {
      const { error } = await supabase.from('attendance_records')
        .upsert({ user_id: form.user_id, date: form.date, type: form.type, note: form.note, status, ...approverFields },
          { onConflict: 'user_id,date' })
      if (error) { alert('저장 실패: ' + error.message) }
      else { setShowForm(false); router.refresh() }
    }
    setSaving(false)
  }

  // 승인
  async function handleApprove(id: number) {
    if (isSample) {
      setAttendance(prev => prev.map(a => a.id === id
        ? { ...a, status: '승인', approver_id: currentUserId, approved_at: new Date().toISOString() } : a))
      return
    }
    const supabase = createClient()
    await supabase.from('attendance_records').update({
      status: '승인', approver_id: currentUserId, approved_at: new Date().toISOString(),
    }).eq('id', id)
    router.refresh()
  }

  // 반려
  async function handleReject() {
    if (!rejectingId || !rejectReason.trim()) { alert('반려 사유를 입력하세요.'); return }
    if (isSample) {
      setAttendance(prev => prev.map(a => a.id === rejectingId
        ? { ...a, status: '반려', approver_id: currentUserId, approved_at: new Date().toISOString(), rejection_reason: rejectReason } : a))
      setRejectingId(null); setRejectReason('')
      return
    }
    const supabase = createClient()
    await supabase.from('attendance_records').update({
      status: '반려', approver_id: currentUserId, approved_at: new Date().toISOString(), rejection_reason: rejectReason,
    }).eq('id', rejectingId)
    setRejectingId(null); setRejectReason('')
    router.refresh()
  }

  // 삭제
  async function handleDelete(id: number) {
    if (isSample) { setAttendance(prev => prev.filter(a => a.id !== id)); return }
    if (!confirm('이 근태 기록을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('attendance_records').delete().eq('id', id)
    router.refresh()
  }

  function getUserName(userId: number) {
    return users.find((u: any) => u.id === userId)?.name ?? `ID:${userId}`
  }
  function getUserDept(userId: number) {
    return users.find((u: any) => u.id === userId)?.departments?.name ?? ''
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
            <p className="text-xs text-gray-500">
              이번 달 근태 {monthAttendance.length}건
              {pendingCount > 0 && <span className="ml-2 text-amber-600 font-semibold">승인 대기 {pendingCount}건</span>}
            </p>
          </div>
        </div>
        <button onClick={() => openForm()}
          className="flex items-center gap-1.5 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243352]">
          <Plus size={16} /> {canManage ? '근태 등록' : '근태 신청'}
        </button>
      </div>

      {/* 대기 알림 배너 */}
      {canManage && pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 font-medium">승인 대기 중인 근태가 {pendingCount}건 있습니다.</span>
          <button onClick={() => setFilterStatus('대기')} className="ml-auto text-xs font-semibold text-amber-700 hover:underline">보기</button>
        </div>
      )}

      {/* 통계 */}
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
        {canManage && (
          <select value={filterDept ?? ''} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : null)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
            <option value="">전체 부서</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400">
          <option value="전체">전체 상태</option>
          <option value="대기">대기</option>
          <option value="승인">승인</option>
          <option value="반려">반려</option>
        </select>
        {(filterDept || filterType !== '전체' || filterStatus !== '전체') && (
          <button onClick={() => { setFilterDept(null); setFilterType('전체'); setFilterStatus('전체') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">필터 초기화</button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ===== 캘린더 ===== */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
            <h2 className="font-bold text-gray-900">{year}년 {month + 1}월</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 gap-px mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-1.5 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="min-h-[72px]" />

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayOfWeek = new Date(year, month, day).getDay()
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSelected = dateStr === selectedDate
              const records = dateAttendanceMap[String(day)] || []
              const hasPending = records.some((r: any) => (r.status || '승인') === '대기')

              return (
                <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[72px] rounded-lg p-1 text-left transition-all border ${
                    isSelected ? 'border-blue-400 bg-blue-50' :
                    hasPending ? 'border-amber-300 border-dashed bg-amber-50/30' :
                    isToday ? 'border-emerald-300 bg-emerald-50/50' :
                    'border-transparent hover:bg-gray-50'
                  }`}>
                  <span className={`text-xs font-semibold ${
                    isToday ? 'text-emerald-600' :
                    dayOfWeek === 0 ? 'text-red-400' :
                    dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-700'
                  }`}>{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {records.slice(0, 3).map((r: any, i: number) => {
                      const meta = TYPE_META[r.type as AttendanceType] || TYPE_META['기타']
                      const isPending = (r.status || '승인') === '대기'
                      return (
                        <div key={i} className={`text-[9px] font-semibold truncate rounded px-1 py-0.5 ${meta.bg} ${meta.color} ${isPending ? 'opacity-60 border border-dashed border-current' : ''}`}>
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
          {selectedDate ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </h3>
                <button onClick={() => openForm(selectedDate)} className="text-xs text-blue-600 font-semibold hover:underline">+ {canManage ? '등록' : '신청'}</button>
              </div>
              {selectedAttendance.length > 0 ? (
                <div className="space-y-2">
                  {selectedAttendance.map((a: any) => {
                    const meta = TYPE_META[a.type as AttendanceType] || TYPE_META['기타']
                    const Icon = meta.icon
                    const status = (a.status || '승인') as AttendanceStatus
                    const statusMeta = STATUS_STYLE[status]
                    const StatusIcon = statusMeta.icon

                    return (
                      <div key={a.id} className={`p-2.5 rounded-lg ${status === '반려' ? 'bg-red-50' : status === '대기' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                            <Icon size={14} className={meta.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-semibold text-sm text-gray-900">{getUserName(a.user_id)}</span>
                              <span className="text-[10px] text-gray-400">{getUserDept(a.user_id)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusMeta.bg} ${statusMeta.color} flex items-center gap-0.5`}>
                                <StatusIcon size={10} /> {statusMeta.label}
                              </span>
                            </div>
                            {a.note && <p className="text-xs text-gray-500 mt-0.5">{a.note}</p>}
                            {a.rejection_reason && (
                              <p className="text-xs text-red-600 mt-0.5">반려 사유: {a.rejection_reason}</p>
                            )}
                          </div>
                          {canManage && (
                            <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        {/* 승인/반려 버튼 */}
                        {canManage && status === '대기' && (
                          <div className="flex gap-2 mt-2 ml-9">
                            <button onClick={() => handleApprove(a.id)}
                              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                              <Check size={12} /> 승인
                            </button>
                            <button onClick={() => { setRejectingId(a.id); setRejectReason('') }}
                              className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                              <XCircle size={12} /> 반려
                            </button>
                          </div>
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

          {/* 직원별 요약 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" /> 직원별 이번 달 현황
            </h3>
            <div className="space-y-2">
              {(canManage ? users : users.filter((u: any) => u.id === currentUserId))
                .filter((u: any) => !filterDept || u.department_id === filterDept)
                .map((user: any) => {
                  const userAtt = monthAttendance.filter((a: any) => a.user_id === user.id)
                  const quota = getLeaveQuota(user.id)
                  const used = getLeaveUsed(user.id)

                  return (
                    <div key={user.id} className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                        {user.name?.slice(0, 1)}
                      </div>
                      <span className="font-semibold text-gray-800 w-14 shrink-0">{user.name}</span>
                      <div className="flex gap-1 flex-wrap flex-1">
                        {userAtt.length > 0 ? userAtt.slice(0, 5).map((a: any, i: number) => {
                          const meta = TYPE_META[a.type as AttendanceType] || TYPE_META['기타']
                          const isPending = (a.status || '승인') === '대기'
                          return (
                            <span key={i} className={`${meta.bg} ${meta.color} text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPending ? 'opacity-60' : ''}`}>
                              {meta.label}
                            </span>
                          )
                        }) : <span className="text-gray-300">-</span>}
                        {userAtt.length > 5 && <span className="text-gray-400">+{userAtt.length - 5}</span>}
                      </div>
                      {quota && (
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          used > quota.total_days ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          연차 {used}/{quota.total_days}
                        </span>
                      )}
                      <span className="text-gray-400 shrink-0">{userAtt.length}건</span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 등록/신청 모달 ===== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h3 className="font-bold text-gray-900 mb-4">{canManage ? '근태 등록' : '근태 신청'}</h3>
            {!canManage && (
              <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                직원 신청은 관리자 승인 후 반영됩니다.
              </div>
            )}
            <div className="space-y-3">
              {canManage ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">직원 *</label>
                  <select value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.position})</option>)}
                  </select>
                </div>
              ) : (
                <div className="text-sm font-semibold text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  {getUserName(currentUserId)}
                </div>
              )}

              {/* 연속 등록 토글 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={dateRange} onChange={e => setDateRange(e.target.checked)}
                  className="rounded border-gray-300" />
                <span className="text-xs font-semibold text-gray-600">연속 등록 (다일)</span>
              </label>

              <div className={dateRange ? 'grid grid-cols-2 gap-2' : ''}>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{dateRange ? '시작일 *' : '날짜 *'}</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                {dateRange && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">종료일 *</label>
                    <input type="date" value={form.dateTo} onChange={e => setForm(p => ({ ...p, dateTo: e.target.value }))}
                      min={form.date}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                )}
              </div>

              {dateRange && form.date && form.dateTo && (
                <div className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                  평일 {getWorkdays(form.date, form.dateTo).length}일 (공휴일/주말 제외)
                </div>
              )}

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

              {/* 연차 잔여 표시 */}
              {LEAVE_TYPES.includes(form.type) && (() => {
                const quota = getLeaveQuota(form.user_id)
                const used = getLeaveUsed(form.user_id)
                if (!quota) return null
                return (
                  <div className={`text-xs rounded-lg px-3 py-2 font-semibold ${
                    used >= quota.total_days ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    연차 잔여: {quota.total_days - used}일 / {quota.total_days}일 (사용 {used}일)
                  </div>
                )
              })()}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">비고</label>
                <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="사유를 입력하세요" />
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full bg-[#1A2744] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-[#243352] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {canManage ? '등록' : '신청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 반려 사유 모달 ===== */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-3">근태 반려</h3>
            <p className="text-xs text-gray-500 mb-3">반려 사유를 입력해주세요.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              rows={3} autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-red-400 focus:outline-none resize-none mb-3"
              placeholder="예: 해당 기간은 프로젝트 마감으로 인해 승인 불가" />
            <div className="flex gap-2">
              <button onClick={() => setRejectingId(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleReject}
                className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-700">반려</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
