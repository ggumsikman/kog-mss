'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ClipboardCheck } from 'lucide-react'

const RESULTS = ['합격', '조건부합격', '불합격'] as const

export default function InspectionDetailClient({
  inspectionId,
  legalCycleMonths,
  today,
  role,
}: {
  inspectionId: number
  legalCycleMonths: number
  today: string
  role: 'admin' | 'manager' | 'employee'
}) {
  const canManage = role === 'admin' || role === 'manager'
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    inspection_date: today,
    result: '합격' as typeof RESULTS[number],
    inspector_agency: '',
    certificate_url: '',
    note: '',
    use_auto_next: true,
    custom_next_date: '',
  })

  function f(key: string, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // 다음 검사일 자동 계산 미리보기
  const autoNextDate = (() => {
    if (!form.inspection_date) return ''
    const d = new Date(form.inspection_date)
    d.setMonth(d.getMonth() + legalCycleMonths)
    return d.toISOString().split('T')[0]
  })()

  async function handleSave() {
    if (!form.inspection_date) { alert('검사일을 선택해 주세요.'); return }
    setSaving(true)
    const supabase = createClient()

    const next_due_date = form.use_auto_next ? autoNextDate : form.custom_next_date
    if (!next_due_date) { alert('다음 검사일을 입력해 주세요.'); setSaving(false); return }

    // 이력 삽입
    const { error: histErr } = await supabase.from('inspection_histories').insert([{
      inspection_id:    inspectionId,
      inspection_date:  form.inspection_date,
      result:           form.result,
      inspector_agency: form.inspector_agency || null,
      certificate_url:  form.certificate_url  || null,
      next_due_date,
      note:             form.note || null,
    }])
    if (histErr) { alert('이력 저장 실패: ' + histErr.message); setSaving(false); return }

    // 본 검사 업데이트
    const { error: updErr } = await supabase
      .from('inspections')
      .update({
        last_inspection_date: form.inspection_date,
        next_due_date,
      })
      .eq('id', inspectionId)
    if (updErr) { alert('검사 업데이트 실패: ' + updErr.message); setSaving(false); return }

    setSaving(false)
    setForm({
      inspection_date: today,
      result: '합격',
      inspector_agency: '',
      certificate_url: '',
      note: '',
      use_auto_next: true,
      custom_next_date: '',
    })
    startTransition(() => router.refresh())
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  if (!canManage) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2">
        <ClipboardCheck size={14} className="text-teal-500" /> 검사 결과 기록
      </h2>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">검사일 *</label>
          <input type="date" value={form.inspection_date} max={today}
            onChange={e => f('inspection_date', e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">검사 결과 *</label>
          <div className="flex gap-2">
            {RESULTS.map(r => (
              <button key={r} onClick={() => f('result', r)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  form.result === r
                    ? r === '합격'      ? 'bg-green-600 text-white border-green-600'
                    : r === '불합격'    ? 'bg-red-500 text-white border-red-500'
                    :                    'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">검사기관</label>
          <input value={form.inspector_agency} onChange={e => f('inspector_agency', e.target.value)}
            placeholder="예: 한국산업안전보건공단" className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">성적서 URL</label>
          <input value={form.certificate_url} onChange={e => f('certificate_url', e.target.value)}
            placeholder="https://..." className={inputCls} />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">다음 검사일</label>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="auto_next" checked={form.use_auto_next}
              onChange={e => f('use_auto_next', e.target.checked)} className="accent-blue-600" />
            <label htmlFor="auto_next" className="text-xs text-gray-600">
              자동 계산 ({legalCycleMonths}개월 후: <strong>{autoNextDate}</strong>)
            </label>
          </div>
          {!form.use_auto_next && (
            <input type="date" value={form.custom_next_date}
              onChange={e => f('custom_next_date', e.target.value)} className={inputCls} />
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">메모</label>
          <textarea value={form.note} onChange={e => f('note', e.target.value)}
            rows={2} className={`${inputCls} resize-none`} placeholder="특이사항, 지적 사항 등" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#1A2744] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#243560] transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? '저장 중...' : '검사 결과 저장'}
        </button>
      </div>
    </div>
  )
}
