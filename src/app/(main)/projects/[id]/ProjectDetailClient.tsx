'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  CheckCircle2, Circle, Trash2, Plus, Save, ChevronDown, Users,
  Flag, CalendarDays, Pencil, X, Loader2
} from 'lucide-react'

interface Milestone {
  id: number
  project_id: number
  title: string
  due_date: string
  completed_at: string | null
  status: '대기' | '완료' | '지연'
}

interface Member {
  project_id: number
  user_id: number
  role: string
  users: { name: string; position: string; departments: { name: string } }
}

interface Props {
  project: any
  milestones: Milestone[]
  members: Member[]
  isDelayed: boolean
  role: 'admin' | 'manager' | 'employee'
}

export default function ProjectDetailClient({ project, milestones: initMilestones, members, isDelayed, role }: Props) {
  const canManage = role === 'admin' || role === 'manager'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── 진행률 편집 ─────────────────────────────────────────
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressVal, setProgressVal] = useState(project.progress_pct)
  const [statusVal, setStatusVal] = useState(project.status)
  const [savingProgress, setSavingProgress] = useState(false)

  async function saveProgress() {
    setSavingProgress(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update({
        progress_pct: progressVal,
        status: statusVal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
    setSavingProgress(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setEditingProgress(false)
    startTransition(() => router.refresh())
  }

  // ── 마일스톤 ─────────────────────────────────────────────
  const [milestones, setMilestones] = useState<Milestone[]>(initMilestones)
  const [showAddMs, setShowAddMs] = useState(false)
  const [msTitle, setMsTitle] = useState('')
  const [msDue, setMsDue] = useState('')
  const [addingMs, setAddingMs] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function addMilestone() {
    if (!msTitle.trim() || !msDue) return
    setAddingMs(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const status = msDue < today ? '지연' : '대기'
    const { data, error } = await supabase
      .from('project_milestones')
      .insert([{ project_id: project.id, title: msTitle.trim(), due_date: msDue, status }])
      .select()
      .single()
    setAddingMs(false)
    if (error) { alert('추가 실패: ' + error.message); return }
    setMilestones(prev => [...prev, data])
    setMsTitle('')
    setMsDue('')
    setShowAddMs(false)
  }

  async function toggleMilestone(ms: Milestone) {
    setTogglingId(ms.id)
    const supabase = createClient()
    const isDone = ms.status === '완료'
    const today = new Date().toISOString().split('T')[0]
    const newStatus = isDone ? (ms.due_date < today ? '지연' : '대기') : '완료'
    const { error } = await supabase
      .from('project_milestones')
      .update({
        status: newStatus,
        completed_at: isDone ? null : new Date().toISOString(),
      })
      .eq('id', ms.id)
    setTogglingId(null)
    if (error) { alert('업데이트 실패: ' + error.message); return }
    setMilestones(prev =>
      prev.map(m => m.id === ms.id
        ? { ...m, status: newStatus, completed_at: isDone ? null : new Date().toISOString() }
        : m
      )
    )
  }

  async function deleteMilestone(id: number) {
    if (!confirm('마일스톤을 삭제하시겠습니까?')) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('project_milestones').delete().eq('id', id)
    setDeletingId(null)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setMilestones(prev => prev.filter(m => m.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const doneCount = milestones.filter(m => m.status === '완료').length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* ── 좌측: 마일스톤 (2/3) ─────────────────────────── */}
      <div className="lg:col-span-2 space-y-5">

        {/* 진행률 편집 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <Flag size={14} className="text-blue-500" />
              진행률 및 상태
            </h2>
            {!editingProgress && canManage ? (
              <button
                onClick={() => setEditingProgress(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Pencil size={12} /> 수정
              </button>
            ) : editingProgress ? (
              <button
                onClick={() => { setEditingProgress(false); setProgressVal(project.progress_pct); setStatusVal(project.status) }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={12} /> 취소
              </button>
            ) : null}
          </div>

          {editingProgress ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">진행률</span>
                  <span className="font-black text-blue-600 text-lg">{progressVal}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={progressVal}
                  onChange={e => setProgressVal(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">상태 변경</label>
                <div className="flex gap-2 flex-wrap">
                  {['진행중', '완료', '보류'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusVal(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        statusVal === s
                          ? s === '완료' ? 'bg-green-500 text-white border-green-500'
                            : s === '보류' ? 'bg-gray-400 text-white border-gray-400'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={saveProgress}
                disabled={savingProgress}
                className="w-full flex items-center justify-center gap-2 bg-[#1A2744] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#243560] transition-colors disabled:opacity-50"
              >
                {savingProgress ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingProgress ? '저장 중...' : '저장'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">현재 진행률</span>
                <span className="font-bold text-gray-800">{progressVal}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${isDelayed ? 'bg-red-400' : progressVal === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${progressVal}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 마일스톤 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <CalendarDays size={14} className="text-purple-500" />
              마일스톤
              {milestones.length > 0 && (
                <span className="text-xs text-gray-400 font-normal">
                  {doneCount}/{milestones.length} 완료
                </span>
              )}
            </h2>
            {canManage && (
              <button
                onClick={() => setShowAddMs(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1A2744] px-3 py-1.5 rounded-lg hover:bg-[#243560] transition-colors"
              >
                <Plus size={12} />
                추가
              </button>
            )}
          </div>

          {/* 마일스톤 추가 폼 */}
          {showAddMs && (
            <div className="px-5 py-4 bg-blue-50/50 border-b border-blue-100">
              <div className="flex gap-2 flex-wrap">
                <input
                  value={msTitle}
                  onChange={e => setMsTitle(e.target.value)}
                  placeholder="마일스톤 제목"
                  className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  onKeyDown={e => e.key === 'Enter' && addMilestone()}
                />
                <input
                  type="date"
                  value={msDue}
                  onChange={e => setMsDue(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
                <button
                  onClick={addMilestone}
                  disabled={addingMs || !msTitle.trim() || !msDue}
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {addingMs ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  등록
                </button>
                <button
                  onClick={() => setShowAddMs(false)}
                  className="text-gray-400 hover:text-gray-600 px-2"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* 마일스톤 목록 */}
          <div className="divide-y divide-gray-50">
            {milestones.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">마일스톤이 없습니다</p>
                <button
                  onClick={() => setShowAddMs(true)}
                  className="mt-2 text-xs text-blue-500 hover:underline"
                >
                  + 첫 마일스톤 추가
                </button>
              </div>
            ) : (
              milestones.map(ms => {
                const msDelayed = ms.due_date < today && ms.status !== '완료'
                const isDone = ms.status === '완료'
                return (
                  <div
                    key={ms.id}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group ${msDelayed ? 'bg-red-50/30' : ''}`}
                  >
                    {/* 완료 토글 */}
                    <button
                      onClick={() => toggleMilestone(ms)}
                      disabled={togglingId === ms.id}
                      className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors disabled:opacity-50"
                    >
                      {togglingId === ms.id
                        ? <Loader2 size={20} className="animate-spin text-gray-400" />
                        : isDone
                          ? <CheckCircle2 size={20} className="text-green-500" />
                          : <Circle size={20} />
                      }
                    </button>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {ms.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${msDelayed ? 'text-red-500 font-semibold' : isDone ? 'text-gray-400' : 'text-gray-400'}`}>
                          {msDelayed ? '⚠ ' : ''}{formatDate(ms.due_date)}
                        </span>
                        {isDone && ms.completed_at && (
                          <span className="text-xs text-green-600">
                            ✓ {formatDate(ms.completed_at.split('T')[0])} 완료
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 상태 뱃지 */}
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isDone ? 'bg-green-100 text-green-700' :
                      msDelayed ? 'bg-red-100 text-red-600 font-semibold' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {ms.status}
                    </span>

                    {/* 삭제 */}
                    {canManage && (
                      <button
                        onClick={() => deleteMilestone(ms.id)}
                        disabled={deletingId === ms.id}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0 disabled:opacity-50"
                      >
                        {deletingId === ms.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 우측: 참여자 (1/3) ───────────────────────────── */}
      <div className="space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <Users size={14} className="text-teal-500" />
              참여자
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {members.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">참여자 없음</p>
            ) : (
              members.map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A2744] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {m.users?.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{m.users?.name}</p>
                    <p className="text-xs text-gray-400">{m.users?.departments?.name} · {m.users?.position}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{m.role}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 프로젝트 정보 요약 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-sm text-gray-800 mb-3">프로젝트 정보</h2>
          <dl className="space-y-2.5 text-sm">
            {[
              { label: '시작일', value: formatDate(project.start_date) },
              { label: '마감일', value: formatDate(project.due_date) },
              { label: '구분', value: project.category },
              { label: '부서', value: project.departments?.name },
              { label: '담당자', value: `${project.users?.name} (${project.users?.position})` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-700 text-right">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
