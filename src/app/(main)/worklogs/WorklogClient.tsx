'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  Trash2, MessageSquare, X, Loader2, AlertCircle, Briefcase, Zap, Clock
} from 'lucide-react'

type LogType = '정기업무' | '프로젝트' | '돌발업무'

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

interface Props {
  logs: WorkLog[]
  users: User[]
  departments: Department[]
  targetDate: string
  today: string
  role: 'admin' | 'manager' | 'employee'
}

const LOG_TYPE_META: Record<LogType, { label: string; color: string; icon: React.ReactNode }> = {
  '정기업무': { label: '정기업무', color: 'bg-blue-100 text-blue-700',    icon: <Briefcase size={11} /> },
  '프로젝트': { label: '프로젝트', color: 'bg-purple-100 text-purple-700', icon: <Clock size={11} /> },
  '돌발업무': { label: '돌발업무', color: 'bg-orange-100 text-orange-700', icon: <Zap size={11} /> },
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function WorklogClient({ logs: initLogs, users, departments, targetDate, today, role }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const canManage = role === 'admin' || role === 'manager'

  // ── 날짜 네비 ────────────────────────────────────────────
  function goDate(date: string) {
    startTransition(() => router.push(`/worklogs?date=${date}`))
  }

  // ── 로그 목록 상태 ───────────────────────────────────────
  const [logs, setLogs] = useState<WorkLog[]>(initLogs)

  // ── 필터 ─────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<LogType | 'all'>('all')
  const [filterUser, setFilterUser] = useState<number | 'all'>('all')

  const filtered = logs.filter(l => {
    if (filterType !== 'all' && l.log_type !== filterType) return false
    if (filterUser !== 'all' && l.user_id !== filterUser) return false
    return true
  })

  // ── 달성률 ───────────────────────────────────────────────
  const total = filtered.length
  const done  = filtered.filter(l => l.achieved).length
  const pct   = total > 0 ? Math.round(done / total * 100) : 0

  // ── 업무 추가 폼 ─────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', log_type: '정기업무' as LogType, description: '', is_planned: true, user_id: users[0]?.id ?? 1 })
  const [adding, setAdding] = useState(false)

  async function addLog() {
    if (!form.title.trim()) return
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

  // ── 달성 토글 ────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [noteEditId, setNoteEditId] = useState<number | null>(null)
  const [noteDraft, setNoteDraft]   = useState('')

  async function toggleAchieved(log: WorkLog) {
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
    // 미달성으로 바꿀 때 사유 입력창 열기
    if (!next) { setNoteEditId(log.id); setNoteDraft(log.note || '') }
  }

  async function saveNote(id: number) {
    const supabase = createClient()
    await supabase.from('work_logs').update({ note: noteDraft }).eq('id', id)
    setLogs(prev => prev.map(l => l.id === id ? { ...l, note: noteDraft } : l))
    setNoteEditId(null)
  }

  // ── 삭제 ────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function deleteLog(id: number) {
    if (!confirm('업무를 삭제하시겠습니까?')) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('work_logs').delete().eq('id', id)
    setDeletingId(null)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const isToday = targetDate === today

  return (
    <div className="space-y-4">

      {/* ── 날짜 네비게이터 ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => goDate(addDays(targetDate, -1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={targetDate}
            max={today}
            onChange={e => goDate(e.target.value)}
            className="border-0 text-sm font-bold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
          <span className="text-sm text-gray-500">{fmtDate(targetDate)}</span>
          {isToday && (
            <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">오늘</span>
          )}
        </div>

        <button
          onClick={() => goDate(addDays(targetDate, 1))}
          disabled={targetDate >= today}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── 달성률 요약 바 ───────────────────────────────── */}
      {total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">오늘 달성률</span>
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

      {/* ── 필터 + 추가 버튼 행 ──────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 유형 필터 */}
        {(['all', '정기업무', '프로젝트', '돌발업무'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterType === t
                ? 'bg-[#1A2744] text-white border-[#1A2744]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t === 'all' ? '전체' : t}
          </button>
        ))}

        {/* 담당자 필터 */}
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none bg-white text-gray-600"
        >
          <option value="all">전체 담당자</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.departments?.name})</option>
          ))}
        </select>

        <div className="ml-auto">
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors"
          >
            <Plus size={15} />
            업무 등록
          </button>
        </div>
      </div>

      {/* ── 업무 등록 폼 ─────────────────────────────────── */}
      {showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-800">업무 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['정기업무', '프로젝트', '돌발업무'] as LogType[]).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, log_type: t }))}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  form.log_type === t
                    ? LOG_TYPE_META[t].color + ' border-current'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {LOG_TYPE_META[t].icon}
                {t}
              </button>
            ))}
          </div>

          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="업무 제목 *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addLog()}
          />

          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="업무 내용 (선택)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={form.user_id}
              onChange={e => setForm(f => ({ ...f, user_id: Number(e.target.value) }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.departments?.name})</option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_planned}
                onChange={e => setForm(f => ({ ...f, is_planned: e.target.checked }))}
                className="rounded"
              />
              사전 계획 업무
            </label>

            <button
              onClick={addLog}
              disabled={adding || !form.title.trim()}
              className="ml-auto flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* ── 업무 목록 ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-gray-400 text-sm mb-2">등록된 업무가 없습니다</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-blue-500 hover:underline"
            >
              + 업무 등록하기
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(log => (
              <div key={log.id} className={`group ${log.achieved ? 'bg-green-50/20' : ''}`}>
                <div className="flex items-start gap-3 px-5 py-4">

                  {/* 달성 체크 */}
                  <button
                    onClick={() => toggleAchieved(log)}
                    disabled={togglingId === log.id}
                    className="mt-0.5 flex-shrink-0 transition-colors disabled:opacity-50"
                  >
                    {togglingId === log.id
                      ? <Loader2 size={22} className="animate-spin text-gray-400" />
                      : log.achieved
                        ? <CheckCircle2 size={22} className="text-green-500" />
                        : <Circle size={22} className="text-gray-300 hover:text-green-400" />
                    }
                  </button>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${LOG_TYPE_META[log.log_type].color}`}>
                        {LOG_TYPE_META[log.log_type].icon}
                        {log.log_type}
                      </span>
                      {!log.is_planned && (
                        <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">비계획</span>
                      )}
                      <span className="text-xs text-gray-400">{log.users?.name} · {log.users?.departments?.name}</span>
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
                        <input
                          autoFocus
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          placeholder="미달성 사유 입력..."
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          onKeyDown={e => e.key === 'Enter' && saveNote(log.id)}
                        />
                        <button
                          onClick={() => saveNote(log.id)}
                          className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                        >저장</button>
                        <button
                          onClick={() => setNoteEditId(null)}
                          className="text-gray-400 hover:text-gray-600"
                        ><X size={14} /></button>
                      </div>
                    )}
                  </div>

                  {/* 우측 액션 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!log.achieved && noteEditId !== log.id && (
                      <button
                        onClick={() => { setNoteEditId(log.id); setNoteDraft(log.note || '') }}
                        title="사유 입력"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 transition-colors"
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => deleteLog(log.id)}
                        disabled={deletingId === log.id}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === log.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 미달성 경고 (계획 업무인데 미달성) */}
                {!log.achieved && log.is_planned && !isToday && (
                  <div className="mx-5 mb-3 flex items-center gap-1.5 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle size={12} />
                    계획 업무 미달성 — 사유를 기록해 주세요
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 이달 통계 요약 링크 ──────────────────────────── */}
      <div className="text-center">
        <a href="/worklogs/stats" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
          이달 업무일지 통계 보기 →
        </a>
      </div>
    </div>
  )
}
