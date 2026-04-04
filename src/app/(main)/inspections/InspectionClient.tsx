'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, Plus, X, ShieldCheck, AlertTriangle, Clock,
  ChevronRight, Building2, Calendar, RotateCcw
} from 'lucide-react'

const CATEGORIES = ['산업안전', '중량물', '소방', '환경', '전기'] as const
type Category = typeof CATEGORIES[number]

const CAT_COLOR: Record<Category, string> = {
  '산업안전': 'bg-red-100 text-red-700',
  '중량물':   'bg-orange-100 text-orange-700',
  '소방':     'bg-yellow-100 text-yellow-700',
  '환경':     'bg-green-100 text-green-700',
  '전기':     'bg-blue-100 text-blue-700',
}

const STATUS_STYLE = {
  '정상': { bg: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',  icon: ShieldCheck,    label: '정상' },
  '임박': { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: Clock,         label: '임박' },
  '만료': { bg: 'bg-red-50 border-red-200',       badge: 'bg-red-100 text-red-700',       icon: AlertTriangle, label: '만료' },
}

export default function InspectionClient({
  inspections,
  departments,
  today,
  role,
}: {
  inspections: any[]
  departments: any[]
  today: string
  role: 'admin' | 'manager' | 'employee'
}) {
  const canManage = role === 'admin' || role === 'manager'
  const router = useRouter()
  const [, startTransition] = useTransition()

  // 필터
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDept,   setFilterDept]   = useState('all')

  // 등록 모달
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: '산업안전' as Category,
    responsible_dept_id: '',
    legal_cycle_months: 12,
    last_inspection_date: '',
    notify_days_before: 30,
    note: '',
  })

  // 필터 적용
  const filtered = inspections
    .filter(i => filterCat    === 'all' || i.category === filterCat)
    .filter(i => filterStatus === 'all' || i.status   === filterStatus)
    .filter(i => filterDept   === 'all' || String(i.responsible_dept_id) === filterDept)

  // 만료/임박 상단 고정
  const expired = filtered.filter(i => i.status === '만료')
  const urgent  = filtered.filter(i => i.status === '임박')
  const normal  = filtered.filter(i => i.status === '정상')

  function f(key: string, val: string | number) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.title || !form.responsible_dept_id || !form.last_inspection_date) {
      alert('검사명, 담당부서, 최근 검사일은 필수입니다.')
      return
    }
    setSaving(true)
    const supabase = createClient()

    // next_due_date 계산
    const lastDate = new Date(form.last_inspection_date)
    lastDate.setMonth(lastDate.getMonth() + Number(form.legal_cycle_months))
    const next_due_date = lastDate.toISOString().split('T')[0]

    const { error } = await supabase.from('inspections').insert([{
      title:                 form.title,
      category:              form.category,
      responsible_dept_id:   Number(form.responsible_dept_id),
      legal_cycle_months:    Number(form.legal_cycle_months),
      last_inspection_date:  form.last_inspection_date,
      next_due_date,
      notify_days_before:    Number(form.notify_days_before),
      note:                  form.note || null,
    }])

    if (error) { alert('등록 실패: ' + error.message); setSaving(false); return }

    setSaving(false)
    setShowForm(false)
    setForm({ title: '', category: '산업안전', responsible_dept_id: '', legal_cycle_months: 12, last_inspection_date: '', notify_days_before: 30, note: '' })
    startTransition(() => router.refresh())
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div>
      {/* 상단 알림 배너 */}
      {expired.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-semibold">
            만료된 검사 {expired.length}건이 있습니다. 즉시 검사를 실시하고 이력을 기록해 주세요.
          </p>
        </div>
      )}
      {urgent.length > 0 && expired.length === 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <Clock size={18} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-700 font-semibold">
            30일 이내 검사 만료 {urgent.length}건 — 사전 준비를 시작하세요.
          </p>
        </div>
      )}

      {/* 필터 + 등록 버튼 */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">전체 분류</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">전체 상태</option>
          <option value="만료">만료</option>
          <option value="임박">임박</option>
          <option value="정상">정상</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="all">전체 부서</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {canManage && (
          <button onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-1.5 bg-[#1A2744] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#243560] transition-colors">
            <Plus size={14} /> 검사 등록
          </button>
        )}
      </div>

      {/* 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">검사 항목이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {[...expired, ...urgent, ...normal].map(ins => {
            const style = STATUS_STYLE[ins.status as '정상' | '임박' | '만료']
            const Icon = style.icon
            const deptName = Array.isArray(ins.departments) ? ins.departments[0]?.name : ins.departments?.name
            return (
              <Link key={ins.id} href={`/inspections/${ins.id}`}
                className={`block bg-white rounded-xl border ${style.bg} p-4 hover:shadow-md transition-shadow`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${style.badge}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${style.badge}`}>{ins.status}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CAT_COLOR[ins.category as Category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ins.category}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{ins.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 size={11} /> {deptName ?? '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <RotateCcw size={11} /> {ins.legal_cycle_months}개월 주기
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> 다음 검사: {ins.next_due_date}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-lg font-black ${ins.status === '만료' ? 'text-red-600' : ins.status === '임박' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {ins.days_until < 0 ? `D+${Math.abs(ins.days_until)}` : ins.days_until === 0 ? 'D-Day' : `D-${ins.days_until}`}
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* 등록 모달 */}
      {canManage && showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">정기검사 등록</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">검사명 *</label>
                <input value={form.title} onChange={e => f('title', e.target.value)}
                  placeholder="예: 크레인 안전검사" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">분류 *</label>
                  <select value={form.category} onChange={e => f('category', e.target.value)} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">법정 주기(개월) *</label>
                  <select value={form.legal_cycle_months} onChange={e => f('legal_cycle_months', e.target.value)} className={inputCls}>
                    {[3, 6, 12, 24, 36, 60].map(m => <option key={m} value={m}>{m}개월</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">담당부서 *</label>
                <select value={form.responsible_dept_id} onChange={e => f('responsible_dept_id', e.target.value)} className={inputCls}>
                  <option value="">선택</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">최근 검사일 *</label>
                <input type="date" value={form.last_inspection_date} max={today}
                  onChange={e => f('last_inspection_date', e.target.value)} className={inputCls} />
                {form.last_inspection_date && (
                  <p className="text-xs text-gray-400 mt-1">
                    다음 검사 예정: {(() => {
                      const d = new Date(form.last_inspection_date)
                      d.setMonth(d.getMonth() + Number(form.legal_cycle_months))
                      return d.toISOString().split('T')[0]
                    })()}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">사전 알림(일)</label>
                <select value={form.notify_days_before} onChange={e => f('notify_days_before', e.target.value)} className={inputCls}>
                  {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d}일 전</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">메모</label>
                <textarea value={form.note} onChange={e => f('note', e.target.value)}
                  rows={2} className={`${inputCls} resize-none`} placeholder="특이사항, 담당 기관 등" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#1A2744] text-white font-semibold py-2.5 rounded-xl hover:bg-[#243560] transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? '저장 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
