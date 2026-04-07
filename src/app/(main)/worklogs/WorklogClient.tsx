'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  Trash2, MessageSquare, X, Loader2, AlertCircle, Briefcase, Zap, Clock,
  Car, UserX, Pencil, Check, Moon, Hammer, FileBarChart2, Bell,
} from 'lucide-react'

// ── 타입 ────────────────────────────────────────────────
type LogType = '정기업무' | '프로젝트' | '돌발업무'
type AttendanceType = '연차' | '반차오전' | '반차오후' | '외근' | '출장' | '재택' | '병가' | '기타'

interface WorkLog {
  id: number
  user_id: number
  log_date: string
  log_type: LogType
  title: string
  description: string
  is_planned: boolean
  achieved: boolean
  note: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users?: any
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface User { id: number; name: string; position: string; department_id: number; departments?: any }
interface Department { id: number; name: string }
interface AttendanceRecord { id?: number; user_id: number; date: string; type: AttendanceType; note?: string }

interface Props {
  logs: WorkLog[]
  users: User[]
  departments: Department[]
  attendance: AttendanceRecord[]
  nonSubmitters: User[]
  targetDate: string
  today: string
  role: 'admin' | 'manager' | 'employee'
  isSample?: boolean
  isRestDay?: boolean
  restLabel?: string
  specialWorkday?: { date: string; reason: string } | null
}

// ── 메타 ────────────────────────────────────────────────
const LOG_TYPE_META: Record<LogType, { label: string; color: string; icon: React.ReactNode }> = {
  '정기업무': { label: '정기업무', color: 'bg-blue-100 text-blue-700',    icon: <Briefcase size={11} /> },
  '프로젝트': { label: '프로젝트', color: 'bg-purple-100 text-purple-700', icon: <Clock size={11} /> },
  '돌발업무': { label: '돌발업무', color: 'bg-orange-100 text-orange-700', icon: <Zap size={11} /> },
}

const ATTENDANCE_META: Record<AttendanceType, { label: string; color: string }> = {
  '연차':    { label: '연차',    color: 'bg-red-100 text-red-700 border-red-200' },
  '반차오전': { label: '반차(오전)', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  '반차오후': { label: '반차(오후)', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  '외근':    { label: '외근',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  '출장':    { label: '출장',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  '재택':    { label: '재택',    color: 'bg-teal-100 text-teal-700 border-teal-200' },
  '병가':    { label: '병가',    color: 'bg-pink-100 text-pink-700 border-pink-200' },
  '기타':    { label: '기타',    color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

// 미작성이 문제없는 근태 유형 (연차/병가 등)
const LEAVE_TYPES: AttendanceType[] = ['연차', '반차오전', '병가']

const ALL_ATTENDANCE_TYPES: AttendanceType[] = [
  '연차', '반차오전', '반차오후', '외근', '출장', '재택', '병가', '기타',
]

// ── 유틸 ────────────────────────────────────────────────
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function WorklogClient({
  logs: initLogs, users, departments, attendance: initAttendance,
  nonSubmitters: initNonSubmitters,
  targetDate, today, role, isSample,
  isRestDay = false, restLabel = '', specialWorkday: initSpecialWorkday = null,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const canManage = isSample || role === 'admin' || role === 'manager'
  // 과거 날짜: 업무일지 읽기 전용 (근태는 관리자가 소급 수정 가능)
  const isPast = targetDate < today

  // ── 특근 상태 ───────────────────────────────────────────
  const [specialWork, setSpecialWork] = useState(initSpecialWorkday)
  const [showSpecialForm, setShowSpecialForm] = useState(false)
  const [specialReason, setSpecialReason] = useState('')
  const [savingSpecial, setSavingSpecial] = useState(false)

  async function addSpecialWorkday() {
    setSavingSpecial(true)
    if (!isSample) {
      const supabase = createClient()
      await supabase.from('special_workdays')
        .upsert({ date: targetDate, reason: specialReason || '특근' })
    }
    setSpecialWork({ date: targetDate, reason: specialReason || '특근' })
    setSavingSpecial(false)
    setShowSpecialForm(false)
    setSpecialReason('')
  }

  async function removeSpecialWorkday() {
    if (!confirm('특근 처리를 취소하시겠습니까? 이 날의 업무일지가 모두 숨겨집니다.')) return
    if (!isSample) {
      const supabase = createClient()
      await supabase.from('special_workdays').delete().eq('date', targetDate)
    }
    setSpecialWork(null)
  }

  // ── 날짜 네비 ──────────────────────────────────────────
  function goDate(date: string) {
    startTransition(() => router.push(`/worklogs?date=${date}`))
  }

  // ── 업무 로그 상태 ──────────────────────────────────────
  const [logs, setLogs] = useState<WorkLog[]>(initLogs)

  // ── 근태 상태 ───────────────────────────────────────────
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initAttendance)
  const [editingAttendUserId, setEditingAttendUserId] = useState<number | null>(null)
  const [attendDraft, setAttendDraft] = useState<{ type: AttendanceType; note: string }>({ type: '외근', note: '' })
  const [savingAttend, setSavingAttend] = useState(false)

  function getAttendance(userId: number): AttendanceRecord | undefined {
    return attendance.find(a => a.user_id === userId)
  }

  function openAttendEdit(user: User) {
    if (!canManage) return
    const existing = getAttendance(user.id)
    setAttendDraft({ type: existing?.type ?? '외근', note: existing?.note ?? '' })
    setEditingAttendUserId(user.id)
  }

  async function saveAttendance(userId: number) {
    setSavingAttend(true)
    if (!isSample) {
      const supabase = createClient()
      const existing = getAttendance(userId)
      if (existing?.id) {
        await supabase.from('attendance_records')
          .update({ type: attendDraft.type, note: attendDraft.note })
          .eq('id', existing.id)
      } else {
        await supabase.from('attendance_records')
          .insert({ user_id: userId, date: targetDate, type: attendDraft.type, note: attendDraft.note })
      }
    }
    setAttendance(prev => {
      const exists = prev.find(a => a.user_id === userId)
      if (exists) {
        return prev.map(a => a.user_id === userId ? { ...a, type: attendDraft.type, note: attendDraft.note } : a)
      }
      return [...prev, { user_id: userId, date: targetDate, type: attendDraft.type, note: attendDraft.note }]
    })
    setSavingAttend(false)
    setEditingAttendUserId(null)
  }

  async function removeAttendance(userId: number) {
    if (!isSample) {
      const supabase = createClient()
      const existing = getAttendance(userId)
      if (existing?.id) {
        await supabase.from('attendance_records').delete().eq('id', existing.id)
      }
    }
    setAttendance(prev => prev.filter(a => a.user_id !== userId))
    setEditingAttendUserId(null)
  }

  // 미작성자 (근태 상태 변경 반영)
  const submittedUserIds = new Set(logs.map(l => l.user_id))
  const nonSubmitters = users.filter(u => !submittedUserIds.has(u.id))

  // ── 필터 ───────────────────────────────────────────────
  const [filterType, setFilterType] = useState<LogType | 'all'>('all')
  const [filterUser, setFilterUser] = useState<number | 'all'>('all')

  const filtered = logs.filter(l => {
    if (filterType !== 'all' && l.log_type !== filterType) return false
    if (filterUser !== 'all' && l.user_id !== filterUser) return false
    return true
  })

  const total = filtered.length
  const done  = filtered.filter(l => l.achieved).length
  const pct   = total > 0 ? Math.round(done / total * 100) : 0

  // ── 업무 등록 폼 ────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', log_type: '정기업무' as LogType,
    description: '', is_planned: true, user_id: users[0]?.id ?? 1,
  })
  const [adding, setAdding] = useState(false)

  async function addLog() {
    if (!form.title.trim()) return
    if (isPast) { alert('지난 날짜의 업무일지는 수정할 수 없습니다.'); return }
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('work_logs')
      .insert([{ ...form, log_date: targetDate, achieved: false }])
      .select('*, users(name, position, departments(name))')
      .single()
    setAdding(false)
    if (error) { alert('추가 실패: ' + error.message); return }
    setLogs(prev => [...prev, data])
    setForm(f => ({ ...f, title: '', description: '' }))
    setShowForm(false)
  }

  // ── 달성 토글 ───────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [noteEditId, setNoteEditId] = useState<number | null>(null)
  const [noteDraft, setNoteDraft]   = useState('')

  async function toggleAchieved(log: WorkLog) {
    if (isPast) { alert('지난 날짜의 업무일지는 수정할 수 없습니다.'); return }
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    setTogglingId(log.id)
    const supabase = createClient()
    const next = !log.achieved
    const { error } = await supabase
      .from('work_logs')
      .update({ achieved: next, note: next ? '' : log.note })
      .eq('id', log.id)
    setTogglingId(null)
    if (error) { alert('업데이트 실패: ' + error.message); return }
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, achieved: next, note: next ? '' : l.note } : l))
    if (!next) { setNoteEditId(log.id); setNoteDraft(log.note || '') }
  }

  async function saveNote(id: number) {
    if (isPast) { alert('지난 날짜의 업무일지는 수정할 수 없습니다.'); return }
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    const supabase = createClient()
    await supabase.from('work_logs').update({ note: noteDraft }).eq('id', id)
    setLogs(prev => prev.map(l => l.id === id ? { ...l, note: noteDraft } : l))
    setNoteEditId(null)
  }

  // ── 삭제 ───────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function deleteLog(id: number) {
    if (isPast) { alert('지난 날짜의 업무일지는 수정할 수 없습니다.'); return }
    if (!confirm('업무를 삭제하시겠습니까?')) return
    if (isSample) { alert('샘플 모드입니다. 실제 저장은 되지 않습니다.'); return }
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('work_logs').delete().eq('id', id)
    setDeletingId(null)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const isToday = targetDate === today

  // ── 마감 시간 (KST 기준 실시간) ────────────────────────
  const [nowMin, setNowMin] = useState<number>(() => {
    const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    return kst.getHours() * 60 + kst.getMinutes()
  })
  useEffect(() => {
    const id = setInterval(() => {
      const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      setNowMin(kst.getHours() * 60 + kst.getMinutes())
    }, 30_000)
    return () => clearInterval(id)
  }, [])
  const NOTIFY_MIN  = 8 * 60        // 08:00
  const DEADLINE_MIN = 8 * 60 + 30  // 08:30
  const isBeforeNotify   = nowMin < NOTIFY_MIN
  const isUrgentWindow   = nowMin >= NOTIFY_MIN && nowMin < DEADLINE_MIN
  const isPastDeadline   = nowMin >= DEADLINE_MIN

  // ── 쉬는 날이고 특근 없으면 조기 반환 ───────────────────
  if (isRestDay && !specialWork) {
    return (
      <div className="space-y-4">
        {/* 날짜 네비 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex items-center justify-between">
          <button onClick={() => goDate(addDays(targetDate, -1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <input type="date" value={targetDate}
              onChange={e => goDate(e.target.value)}
              className="border-0 text-sm font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
            />
            <span className="text-sm text-gray-500">{fmtDate(targetDate)}</span>
            {isToday && <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">오늘</span>}
            <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{restLabel}</span>
          </div>
          <button onClick={() => goDate(addDays(targetDate, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 쉬는 날 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Moon size={28} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-700 mb-1">{restLabel} — 쉬는 날입니다</p>
            <p className="text-sm text-gray-400">특근이 있는 경우 아래 버튼으로 처리해 주세요.</p>
          </div>

          {canManage && !showSpecialForm && (
            <button
              onClick={() => setShowSpecialForm(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Hammer size={15} />
              특근 처리
            </button>
          )}

          {canManage && showSpecialForm && (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                value={specialReason}
                onChange={e => setSpecialReason(e.target.value)}
                placeholder="특근 사유 (예: 월말 생산 완료)"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-orange-400"
                onKeyDown={e => e.key === 'Enter' && addSpecialWorkday()}
              />
              <button
                onClick={addSpecialWorkday}
                disabled={savingSpecial}
                className="flex items-center gap-1.5 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {savingSpecial ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                확인
              </button>
              <button onClick={() => setShowSpecialForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 미작성자 분류 ────────────────────────────────────────
  const nonSubmittersWithAttend = nonSubmitters.map(u => ({
    ...u,
    attend: getAttendance(u.id),
  }))
  const excused   = nonSubmittersWithAttend.filter(u => u.attend && LEAVE_TYPES.includes(u.attend.type))
  const unexcused = nonSubmittersWithAttend.filter(u => !u.attend || !LEAVE_TYPES.includes(u.attend.type))

  return (
    <div className="space-y-4">

      {/* ── 날짜 네비 ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex items-center justify-between">
        <button onClick={() => goDate(addDays(targetDate, -1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <input type="date" value={targetDate}
            onChange={e => goDate(e.target.value)}
            className="border-0 text-sm font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
          <span className="text-sm text-gray-500">{fmtDate(targetDate)}</span>
          {isToday && <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">오늘</span>}
          {targetDate > today && <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">미래</span>}
          {isPast && <span className="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">🔒 읽기 전용</span>}
          {/* 특근 뱃지 (쉬는 날 + 특근 처리된 경우) */}
          {isRestDay && specialWork && (
            <span className="text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Hammer size={10} />
              특근 — {specialWork.reason}
              {canManage && (
                <button onClick={removeSpecialWorkday} className="ml-0.5 hover:text-red-600 transition-colors" title="특근 취소">
                  <X size={10} />
                </button>
              )}
            </span>
          )}
          {/* 평일 공휴일 뱃지 */}
          {isRestDay && !specialWork && restLabel && (
            <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{restLabel}</span>
          )}
        </div>
        <button onClick={() => goDate(addDays(targetDate, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronRight size={18} />
        </button>
        {/* 보고서 버튼 */}
        <a
          href={`/worklogs/report?type=daily&date=${targetDate}`}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1A2744] border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors hover:border-[#1A2744]"
        >
          <FileBarChart2 size={13} />
          보고서
        </a>
      </div>

      {/* ── 8:30 마감 배너 (오늘 + 미작성자 있을 때) ─── */}
      {isToday && unexcused.length > 0 && (
        <div className={`rounded-xl px-5 py-3 flex items-center gap-3 ${
          isPastDeadline
            ? 'bg-red-600 text-white'
            : isUrgentWindow
              ? 'bg-orange-500 text-white'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <Bell size={16} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isBeforeNotify && (
              <p className="text-sm font-semibold">오늘 업무일지 마감: <strong>오전 8:30</strong> — 미작성자 {unexcused.length}명</p>
            )}
            {isUrgentWindow && (
              <p className="text-sm font-bold">⏰ 마감 임박! 오전 8:30까지 업무일지를 작성해 주세요 — 미작성자 {unexcused.length}명</p>
            )}
            {isPastDeadline && (
              <p className="text-sm font-bold">🔔 마감 초과 — 미작성자 {unexcused.length}명에게 알림이 발송되었습니다</p>
            )}
          </div>
          <span className="text-xs opacity-80 flex-shrink-0">
            마감 08:30
          </span>
        </div>
      )}

      {/* ── 직원 근태 현황 ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Car size={15} className="text-gray-500" />
            직원 근태 현황
          </h2>
          <span className="text-xs text-gray-400">클릭하여 근태 등록·수정</span>
        </div>

        <div className="divide-y divide-gray-50">
          {users.map(user => {
            const attend = getAttendance(user.id)
            const isEditing = editingAttendUserId === user.id
            const meta = attend ? ATTENDANCE_META[attend.type] : null

            return (
              <div key={user.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  {/* 직원 정보 */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{user.position} · {(user.departments as any)?.name}</span>
                  </div>

                  {/* 근태 뱃지 / 편집 버튼 */}
                  {!isEditing ? (
                    <button
                      onClick={() => openAttendEdit(user)}
                      disabled={!canManage}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        meta
                          ? meta.color
                          : 'bg-green-50 text-green-700 border-green-200'
                      } ${canManage ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                    >
                      {meta ? meta.label : '출근'}
                      {canManage && <Pencil size={10} className="opacity-50" />}
                    </button>
                  ) : (
                    /* 인라인 편집 */
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <select
                        value={attendDraft.type}
                        onChange={e => setAttendDraft(d => ({ ...d, type: e.target.value as AttendanceType }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
                      >
                        {ALL_ATTENDANCE_TYPES.map(t => (
                          <option key={t} value={t}>{ATTENDANCE_META[t].label}</option>
                        ))}
                      </select>
                      <input
                        value={attendDraft.note}
                        onChange={e => setAttendDraft(d => ({ ...d, note: e.target.value }))}
                        placeholder="메모 (선택)"
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-32 focus:outline-none"
                      />
                      <button
                        onClick={() => saveAttendance(user.id)}
                        disabled={savingAttend}
                        className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {savingAttend ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      {attend && (
                        <button
                          onClick={() => removeAttendance(user.id)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="근태 기록 삭제"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <button onClick={() => setEditingAttendUserId(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 근태 메모 */}
                {!isEditing && attend?.note && (
                  <p className="text-xs text-gray-400 mt-1 ml-0 pl-0">{attend.note}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 미작성자 알림 ──────────────────────────────── */}
      {nonSubmitters.length > 0 && (
        <div className={`rounded-xl border px-5 py-4 ${
          unexcused.length > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <UserX size={15} className={unexcused.length > 0 ? 'text-red-600' : 'text-yellow-600'} />
            <h3 className={`text-sm font-bold ${unexcused.length > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
              업무일지 미작성자 {nonSubmitters.length}명
            </h3>
          </div>
          <div className="space-y-2">
            {/* 미작성 (사유 없음) */}
            {unexcused.map(u => (
              <div key={u.id} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-0.5" />
                <span className="font-semibold text-gray-800">{u.name}</span>
                <span className="text-gray-500">{u.position} · {(u.departments as any)?.name}</span>
                {u.attend && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${ATTENDANCE_META[u.attend.type].color}`}>
                    {ATTENDANCE_META[u.attend.type].label}
                  </span>
                )}
              </div>
            ))}
            {/* 미작성 (연차·병가 등 사유 있음) */}
            {excused.map(u => (
              <div key={u.id} className="flex items-center gap-2 text-sm opacity-70">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-0.5" />
                <span className="font-semibold text-gray-600">{u.name}</span>
                <span className="text-gray-400">{u.position} · {(u.departments as any)?.name}</span>
                {u.attend && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${ATTENDANCE_META[u.attend.type].color}`}>
                    {ATTENDANCE_META[u.attend.type].label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 달성률 요약 바 ────────────────────────────── */}
      {total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">달성률</span>
            <span className={`text-sm font-black ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {done}/{total}건 · {pct}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            {(['정기업무', '프로젝트', '돌발업무'] as LogType[]).map(t => {
              const tLogs = filtered.filter(l => l.log_type === t)
              if (tLogs.length === 0) return null
              const tDone = tLogs.filter(l => l.achieved).length
              return (
                <span key={t} className="flex items-center gap-1">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${LOG_TYPE_META[t].color}`}>
                    {LOG_TYPE_META[t].icon}{t}
                  </span>
                  {tDone}/{tLogs.length}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 필터 + 추가 버튼 ──────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', '정기업무', '프로젝트', '돌발업무'] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterType === t
                ? 'bg-[#1A2744] text-white border-[#1A2744]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {t === 'all' ? '전체' : t}
          </button>
        ))}
        <select value={filterUser}
          onChange={e => setFilterUser(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none bg-white text-gray-600">
          <option value="all">전체 담당자</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({(u.departments as any)?.name})</option>
          ))}
        </select>
        {!isPast && (
          <div className="ml-auto">
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors">
              <Plus size={15} />
              업무 등록
            </button>
          </div>
        )}
      </div>

      {/* ── 업무 등록 폼 ──────────────────────────────── */}
      {showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-800">업무 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['정기업무', '프로젝트', '돌발업무'] as LogType[]).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, log_type: t }))}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  form.log_type === t
                    ? LOG_TYPE_META[t].color + ' border-current'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {LOG_TYPE_META[t].icon}{t}
              </button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="업무 제목 *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addLog()}
          />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="업무 내용 (선택)" rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: Number(e.target.value) }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white">
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({(u.departments as any)?.name})</option>
              ))}
            </select>
            <button onClick={addLog} disabled={adding || !form.title.trim()}
              className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* ── 업무 목록 ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-gray-400 text-sm mb-2">등록된 업무가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="text-xs text-blue-500 hover:underline">
              + 업무 등록하기
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(log => {
              const userAttend = getAttendance(log.user_id)
              return (
                <div key={log.id} className={`group ${log.achieved ? 'bg-green-50/20' : ''}`}>
                  <div className="flex items-start gap-3 px-5 py-4">

                    {/* 달성 체크 (과거 날짜는 아이콘만 표시) */}
                    {isPast ? (
                      <div className="mt-0.5 flex-shrink-0">
                        {log.achieved
                          ? <CheckCircle2 size={22} className="text-green-400 opacity-60" />
                          : <Circle size={22} className="text-gray-300 opacity-60" />
                        }
                      </div>
                    ) : (
                      <button onClick={() => toggleAchieved(log)} disabled={togglingId === log.id}
                        className="mt-0.5 flex-shrink-0 transition-colors disabled:opacity-50">
                        {togglingId === log.id
                          ? <Loader2 size={22} className="animate-spin text-gray-400" />
                          : log.achieved
                            ? <CheckCircle2 size={22} className="text-green-500" />
                            : <Circle size={22} className="text-gray-300 hover:text-green-400" />
                        }
                      </button>
                    )}

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${LOG_TYPE_META[log.log_type].color}`}>
                          {LOG_TYPE_META[log.log_type].icon}
                          {log.log_type}
                        </span>
                        {log.log_type === '돌발업무' && (
                          <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">돌발</span>
                        )}
                        <span className="text-xs text-gray-400">{log.users?.name} · {log.users?.departments?.name}</span>
                        {/* 근태 뱃지 */}
                        {userAttend && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${ATTENDANCE_META[userAttend.type].color}`}>
                            {ATTENDANCE_META[userAttend.type].label}
                          </span>
                        )}
                      </div>

                      <p className={`text-sm font-semibold ${log.achieved ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {log.title}
                      </p>

                      {log.description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{log.description}</p>
                      )}

                      {/* 미달성 사유 */}
                      {!log.achieved && log.note && noteEditId !== log.id && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2">
                          <MessageSquare size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
                          <span>{log.note}</span>
                        </div>
                      )}

                      {/* 사유 입력창 */}
                      {noteEditId === log.id && (
                        <div className="mt-2 flex gap-2">
                          <input autoFocus value={noteDraft}
                            onChange={e => setNoteDraft(e.target.value)}
                            placeholder="미달성 사유 입력..."
                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            onKeyDown={e => e.key === 'Enter' && saveNote(log.id)}
                          />
                          <button onClick={() => saveNote(log.id)}
                            className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                            저장
                          </button>
                          <button onClick={() => setNoteEditId(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 우측 액션 (과거 날짜 숨김) */}
                    {!isPast && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!log.achieved && noteEditId !== log.id && (
                          <button onClick={() => { setNoteEditId(log.id); setNoteDraft(log.note || '') }}
                            title="사유 입력"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 transition-colors">
                            <MessageSquare size={14} />
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => deleteLog(log.id)} disabled={deletingId === log.id}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deletingId === log.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 미달성 경고 */}
                  {!log.achieved && log.log_type !== '돌발업무' && !isToday && (
                    <div className="mx-5 mb-3 flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                      <AlertCircle size={12} />
                      계획 업무 미달성 — 사유를 기록해 주세요
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
