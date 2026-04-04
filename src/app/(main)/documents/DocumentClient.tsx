'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Plus, X, Loader2, FileText, AlertTriangle, ChevronRight,
  Calendar, User, Building2, Clock, CheckCircle2, Archive
} from 'lucide-react'
import Link from 'next/link'

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  '접수':   { color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-200' },
  '처리중': { color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  '완료':   { color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200' },
  '폐기':   { color: 'text-gray-500',   bg: 'bg-gray-100',   border: 'border-gray-200' },
}
const CAT_META: Record<string, string> = {
  '행정': 'bg-blue-100 text-blue-700',
  '법률': 'bg-red-100 text-red-700',
  '기술': 'bg-purple-100 text-purple-700',
  '계약': 'bg-green-100 text-green-700',
  '기타': 'bg-gray-100 text-gray-500',
}

// 보존연한 옵션
const RETENTION_OPTIONS = [
  { label: '1년', days: 365 },
  { label: '3년', days: 1095 },
  { label: '5년', days: 1825 },
  { label: '10년', days: 3650 },
  { label: '영구', days: 36500 },
]

interface Doc {
  id: number
  doc_number: string
  title: string
  sender: string
  received_date: string
  status: string
  category: string
  days_since: number
  disposal_date: string
  summary: string
  users: any
  handler: any
  departments: any
}

export default function DocumentClient({
  docs: initDocs,
  users,
  departments,
  today,
  role,
}: {
  docs: Doc[]
  users: any[]
  departments: any[]
  today: string
  role: 'admin' | 'manager' | 'employee'
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const canManage = role === 'admin' || role === 'manager'
  const [docs, setDocs] = useState<Doc[]>(initDocs)

  // ── 필터 ─────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat,    setFilterCat]    = useState('all')

  const filtered = docs.filter(d => {
    if (filterStatus !== 'all' && d.status   !== filterStatus) return false
    if (filterCat    !== 'all' && d.category !== filterCat)    return false
    return true
  })

  // ── 등록 폼 ─────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [retention, setRetention] = useState(1825) // 기본 5년
  const [form, setForm] = useState({
    title:         '',
    doc_number:    '',
    sender:        '',
    received_date: today,
    category:      '행정',
    department_id: departments[0]?.id ?? null,
    received_by:   users[0]?.id ?? null,
    handler_id:    null as number | null,
    summary:       '',
  })
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function addDocument() {
    if (!form.title.trim() || !form.received_date) return
    setAdding(true)
    const supabase = createClient()

    const disposalDate = new Date(form.received_date)
    disposalDate.setDate(disposalDate.getDate() + retention)

    const { data, error } = await supabase
      .from('official_documents')
      .insert([{
        ...form,
        status: '접수',
        disposal_date: disposalDate.toISOString().split('T')[0],
      }])
      .select(`*, users!received_by(name, position), handler:users!handler_id(name), departments(name)`)
      .single()

    if (error) { alert('등록 실패: ' + error.message); setAdding(false); return }

    // 접수 이력 자동 생성
    await supabase.from('document_histories').insert([{
      document_id: data.id,
      action: '접수',
      actor_id: form.received_by,
      note: '공문서 접수 등록',
    }])

    const daysSince = Math.floor(
      (new Date(today).getTime() - new Date(data.received_date).getTime()) / 86400000
    )
    setDocs(prev => [{ ...data, days_since: daysSince }, ...prev])
    setAdding(false)
    setShowForm(false)
    setForm(f => ({ ...f, title: '', doc_number: '', sender: '', summary: '' }))
  }

  const STATUSES = ['전체', '접수', '처리중', '완료', '폐기']
  const CATEGORIES = ['전체', '행정', '법률', '기술', '계약', '기타']

  return (
    <div className="space-y-4">

      {/* ── 3일 초과 미처리 경고 배너 ───────────────────── */}
      {(() => {
        const overdue = filtered.filter(d => ['접수','처리중'].includes(d.status) && d.days_since >= 3)
        if (overdue.length === 0) return null
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-bold text-red-600 mb-3 flex items-center gap-1.5">
              <AlertTriangle size={12} /> 접수 후 3일 이상 미처리 — 즉시 조치 필요
            </p>
            <div className="space-y-2">
              {overdue.map(d => (
                <Link key={d.id} href={`/documents/${d.id}`}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 shadow-sm border border-red-100 hover:border-red-300 transition-colors group">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_META[d.status].bg} ${STATUS_META[d.status].color}`}>
                      {d.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{d.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{d.sender}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {d.days_since}일째
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-red-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── 필터 + 등록 ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s === '전체' ? 'all' : s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              (s === '전체' ? filterStatus === 'all' : filterStatus === s)
                ? 'bg-[#1A2744] text-white border-[#1A2744]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {s}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-200" />
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(c === '전체' ? 'all' : c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              (c === '전체' ? filterCat === 'all' : filterCat === c)
                ? 'bg-[#1A2744] text-white border-[#1A2744]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {c}
          </button>
        ))}
        {canManage && (
          <div className="ml-auto">
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors">
              <Plus size={15} /> 공문서 등록
            </button>
          </div>
        )}
      </div>

      {/* ── 등록 폼 ─────────────────────────────────────── */}
      {canManage && showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">공문서 접수 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">문서 제목 *</label>
              <input value={form.title} onChange={e => setF('title', e.target.value)}
                placeholder="공문서 제목"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">문서번호</label>
              <input value={form.doc_number} onChange={e => setF('doc_number', e.target.value)}
                placeholder="예: 고용노동부-2026-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">발신처 *</label>
              <input value={form.sender} onChange={e => setF('sender', e.target.value)}
                placeholder="발신 기관명"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">접수일 *</label>
              <input type="date" value={form.received_date} onChange={e => setF('received_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">카테고리</label>
              <select value={form.category} onChange={e => setF('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                {['행정','법률','기술','계약','기타'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">담당 부서</label>
              <select value={form.department_id ?? ''} onChange={e => setF('department_id', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">접수자</label>
              <select value={form.received_by ?? ''} onChange={e => setF('received_by', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">담당자 (처리)</label>
              <select value={form.handler_id ?? ''} onChange={e => setF('handler_id', e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="">미배정</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 보존연한 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">보존연한</label>
            <div className="flex gap-2 flex-wrap">
              {RETENTION_OPTIONS.map(r => (
                <button key={r.days} onClick={() => setRetention(r.days)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    retention === r.days ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <textarea value={form.summary} onChange={e => setF('summary', e.target.value)}
            placeholder="공문 요약 내용 (선택)" rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
          />

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={addDocument} disabled={adding || !form.title.trim() || !form.sender.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? '등록 중...' : '접수 등록'}
            </button>
          </div>
        </div>
      )}

      {/* ── 공문서 목록 ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">공문서가 없습니다</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-blue-500 hover:underline">+ 공문서 등록하기</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">문서 제목</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">구분</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">발신처</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">접수일</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">담당자</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">상태</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(d => {
                const isOverdue = ['접수','처리중'].includes(d.status) && d.days_since >= 3
                const deptName = Array.isArray(d.departments) ? d.departments[0]?.name : d.departments?.name
                return (
                  <tr key={d.id} className={`hover:bg-gray-50 transition-colors group ${isOverdue ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {isOverdue && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="font-semibold text-gray-800 truncate max-w-52">{d.title}</p>
                          {d.doc_number && <p className="text-xs text-gray-400">{d.doc_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${CAT_META[d.category] ?? CAT_META['기타']}`}>
                        {d.category}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-xs text-gray-600 truncate max-w-32">{d.sender}</p>
                      {deptName && <p className="text-xs text-gray-400">{deptName}</p>}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <p className="text-xs text-gray-600">{formatDate(d.received_date)}</p>
                      {isOverdue && (
                        <p className="text-xs font-bold text-red-500">{d.days_since}일째</p>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-xs text-gray-600">
                        {d.handler?.name ?? d.users?.name ?? '-'}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${STATUS_META[d.status]?.bg} ${STATUS_META[d.status]?.color} ${STATUS_META[d.status]?.border}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/documents/${d.id}`}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-xs text-blue-600 hover:underline transition-opacity">
                        상세 <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
