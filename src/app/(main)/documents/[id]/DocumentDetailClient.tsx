'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowRight, CheckCircle2, Trash2, User } from 'lucide-react'

type DocStatus = '접수' | '처리중' | '완료' | '폐기'

// 상태 흐름 정의
const FLOW: Record<DocStatus, { next: DocStatus; action: string; color: string }[]> = {
  '접수':   [
    { next: '처리중', action: '처리', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { next: '폐기',   action: '폐기', color: 'bg-gray-400 hover:bg-gray-500' },
  ],
  '처리중': [
    { next: '완료', action: '완료', color: 'bg-green-600 hover:bg-green-700' },
    { next: '접수', action: '반려', color: 'bg-red-500 hover:bg-red-600' },
    { next: '폐기', action: '폐기', color: 'bg-gray-400 hover:bg-gray-500' },
  ],
  '완료':   [
    { next: '폐기', action: '폐기', color: 'bg-gray-400 hover:bg-gray-500' },
  ],
  '폐기':   [],
}

const STATUS_STEPS: DocStatus[] = ['접수', '처리중', '완료', '폐기']

export default function DocumentDetailClient({
  doc,
  users,
  documentId,
  role,
}: {
  doc: any
  users: any[]
  documentId: number
  role: 'admin' | 'manager' | 'employee'
}) {
  const canManage = role === 'admin' || role === 'manager'
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState<DocStatus>(doc.status)
  const [handlerId, setHandlerId] = useState<number | null>(doc.handler_id ?? null)
  const [note, setNote] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [savingHandler, setSavingHandler] = useState(false)

  const nextSteps = FLOW[currentStatus] ?? []
  const currentStepIdx = STATUS_STEPS.indexOf(currentStatus)

  async function changeStatus(next: DocStatus, action: string) {
    setProcessing(action)
    const supabase = createClient()

    const updates: any = { status: next }
    if (next === '완료') updates.handled_at = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('official_documents')
      .update(updates)
      .eq('id', documentId)

    if (updateErr) { alert('상태 변경 실패: ' + updateErr.message); setProcessing(null); return }

    await supabase.from('document_histories').insert([{
      document_id: documentId,
      action,
      actor_id: doc.users?.id ?? users[0]?.id,
      note: note || null,
    }])

    setCurrentStatus(next)
    setNote('')
    setProcessing(null)
    startTransition(() => router.refresh())
  }

  async function saveHandler() {
    setSavingHandler(true)
    const supabase = createClient()
    await supabase.from('official_documents').update({ handler_id: handlerId }).eq('id', documentId)

    if (handlerId) {
      await supabase.from('document_histories').insert([{
        document_id: documentId,
        action: '배포',
        actor_id: doc.users?.id ?? users[0]?.id,
        note: `담당자 배정: ${users.find(u => u.id === handlerId)?.name}`,
      }])
    }
    setSavingHandler(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      {/* 진행 단계 표시 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-sm text-gray-800 mb-4">처리 단계</h2>
        <div className="space-y-2">
          {STATUS_STEPS.filter(s => s !== '폐기').map((step, idx) => {
            const isDone  = STATUS_STEPS.indexOf(currentStatus) > idx
            const isCur   = currentStatus === step
            const isPending = STATUS_STEPS.indexOf(currentStatus) < idx
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isDone ? 'bg-green-500 text-white' :
                  isCur  ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-sm font-semibold ${
                  isCur ? 'text-blue-700' : isDone ? 'text-green-700' : 'text-gray-400'
                }`}>
                  {step}
                </span>
                {isCur && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold ml-auto">현재</span>
                )}
              </div>
            )
          })}
          {currentStatus === '폐기' && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">✓</div>
              <span className="text-sm font-semibold text-gray-500">폐기 완료</span>
            </div>
          )}
        </div>
      </div>

      {/* 담당자 배정 */}
      {canManage && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
          <User size={13} className="text-teal-500" /> 담당자 배정
        </h2>
        <select
          value={handlerId ?? ''}
          onChange={e => setHandlerId(e.target.value ? Number(e.target.value) : null)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
        >
          <option value="">미배정</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name})
            </option>
          ))}
        </select>
        <button onClick={saveHandler} disabled={savingHandler}
          className="w-full flex items-center justify-center gap-2 bg-[#1A2744] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#243560] transition-colors disabled:opacity-50">
          {savingHandler ? <Loader2 size={13} className="animate-spin" /> : null}
          {savingHandler ? '저장 중...' : '담당자 저장'}
        </button>
      </div>

      }

      {/* 상태 변경 */}
      {canManage && nextSteps.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-sm text-gray-800 mb-3">상태 변경</h2>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="처리 메모 (선택)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-3"
          />
          <div className="space-y-2">
            {nextSteps.map(({ next, action, color }) => (
              <button key={action}
                onClick={() => changeStatus(next, action)}
                disabled={!!processing}
                className={`w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 ${color}`}>
                {processing === action
                  ? <Loader2 size={14} className="animate-spin" />
                  : <ArrowRight size={14} />
                }
                {processing === action ? '처리 중...' : `→ ${action} (${next})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStatus === '폐기' && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 text-center">
          <Trash2 size={24} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-semibold">폐기 처리 완료</p>
          <p className="text-xs text-gray-400 mt-1">더 이상 상태 변경이 불가합니다</p>
        </div>
      )}
    </div>
  )
}
