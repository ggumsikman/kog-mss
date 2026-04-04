'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import {
  Plus, X, Loader2, GraduationCap, AlertTriangle,
  CalendarDays, MapPin, User, ChevronRight, BookOpen, ShieldAlert
} from 'lucide-react'
import Link from 'next/link'

interface Department { id: number; name: string }
interface Education {
  id: number
  title: string
  edu_type: '의무' | '사내'
  category: string
  scheduled_date: string
  duration_hours: number
  instructor: string
  location: string
  status: '예정' | '완료' | '취소'
  description: string
  notify_days_before: number
  days_until: number
  education_targets?: { department_id: number; departments: { name: string } }[]
}

const TYPE_META = {
  '의무': { color: 'bg-red-100 text-red-700 border-red-200', icon: <ShieldAlert size={11} /> },
  '사내': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <BookOpen size={11} /> },
}
const CAT_COLORS: Record<string, string> = {
  '품질': 'bg-purple-100 text-purple-700',
  '생산': 'bg-orange-100 text-orange-700',
  '안전': 'bg-red-100 text-red-700',
  '법정': 'bg-gray-100 text-gray-700',
  '기타': 'bg-gray-100 text-gray-500',
}
const STATUS_COLOR = {
  '예정': 'bg-blue-100 text-blue-700',
  '완료': 'bg-green-100 text-green-700',
  '취소': 'bg-gray-100 text-gray-500',
}

function DdayBadge({ days, status }: { days: number; status: string }) {
  if (status === '완료') return <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">완료</span>
  if (status === '취소') return <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">취소</span>
  if (days < 0)  return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">⚠ {Math.abs(days)}일 초과</span>
  if (days === 0) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">D-Day</span>
  if (days <= 7)  return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">D-{days}</span>
  if (days <= 30) return <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">D-{days}</span>
  return <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">D-{days}</span>
}

export default function EducationClient({
  educations: initEds,
  departments,
  today,
}: {
  educations: Education[]
  departments: Department[]
  today: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // ── 필터 ─────────────────────────────────────────────────
  const [filterDept,   setFilterDept]   = useState<number | 'all'>('all')
  const [filterType,   setFilterType]   = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = initEds.filter(e => {
    if (filterType   !== 'all' && e.edu_type !== filterType) return false
    if (filterStatus !== 'all' && e.status   !== filterStatus) return false
    if (filterDept   !== 'all') {
      const targets = e.education_targets ?? []
      if (!targets.some(t => t.department_id === filterDept)) return false
    }
    return true
  })

  // ── 교육 등록 폼 ─────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false)
  const [adding, setAdding]       = useState(false)
  const [selDepts, setSelDepts]   = useState<number[]>([])
  const [form, setForm] = useState({
    title: '',
    edu_type: '사내' as '의무' | '사내',
    category: '품질',
    scheduled_date: '',
    duration_hours: '',
    instructor: '',
    location: '',
    description: '',
    notify_days_before: 7,
  })
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  function toggleDept(id: number) {
    setSelDepts(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  async function addEducation() {
    if (!form.title.trim() || !form.scheduled_date) return
    setAdding(true)
    const supabase = createClient()

    const { data: edu, error } = await supabase
      .from('education_schedules')
      .insert([{
        title: form.title.trim(),
        edu_type: form.edu_type,
        category: form.category,
        scheduled_date: form.scheduled_date,
        duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
        instructor: form.instructor || null,
        location: form.location || null,
        description: form.description || null,
        notify_days_before: form.notify_days_before,
        status: '예정',
      }])
      .select()
      .single()

    if (error) { alert('등록 실패: ' + error.message); setAdding(false); return }

    // 대상 부서 연결
    if (selDepts.length > 0) {
      await supabase.from('education_targets').insert(
        selDepts.map(d => ({ education_id: edu.id, department_id: d }))
      )
    }

    setAdding(false)
    setShowForm(false)
    setForm({ title: '', edu_type: '사내', category: '품질', scheduled_date: '', duration_hours: '', instructor: '', location: '', description: '', notify_days_before: 7 })
    setSelDepts([])
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">

      {/* ── 필터 + 등록 행 ───────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 유형 */}
        {(['all', '의무', '사내'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterType === t ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t === 'all' ? '전체 유형' : t}
          </button>
        ))}

        <div className="w-px h-4 bg-gray-200" />

        {/* 상태 */}
        {(['all', '예정', '완료', '취소'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s ? 'bg-[#1A2744] text-white border-[#1A2744]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s === 'all' ? '전체 상태' : s}
          </button>
        ))}

        <div className="w-px h-4 bg-gray-200" />

        {/* 부서 */}
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none bg-white text-gray-600"
        >
          <option value="all">전체 부서</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <div className="ml-auto">
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors"
          >
            <Plus size={15} /> 교육 등록
          </button>
        </div>
      </div>

      {/* ── 교육 등록 폼 ─────────────────────────────────── */}
      {showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">교육 일정 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          {/* 유형 + 카테고리 */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">교육 유형</p>
              <div className="flex gap-2">
                {(['의무', '사내'] as const).map(t => (
                  <button key={t} onClick={() => setF('edu_type', t)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      form.edu_type === t ? TYPE_META[t].color : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {TYPE_META[t].icon} {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">카테고리</p>
              <select value={form.category} onChange={e => setF('category', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
                {['품질', '생산', '안전', '법정', '기타'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* 제목 */}
          <input value={form.title} onChange={e => setF('title', e.target.value)}
            placeholder="교육명 *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />

          {/* 날짜 / 시간 / 강사 / 장소 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">교육일 *</label>
              <input type="date" value={form.scheduled_date} onChange={e => setF('scheduled_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">교육 시간 (h)</label>
              <input type="number" min={0.5} max={24} step={0.5} value={form.duration_hours} onChange={e => setF('duration_hours', e.target.value)}
                placeholder="예: 2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">강사</label>
              <input value={form.instructor} onChange={e => setF('instructor', e.target.value)}
                placeholder="강사명 또는 기관"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">장소</label>
              <input value={form.location} onChange={e => setF('location', e.target.value)}
                placeholder="교육 장소"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
          </div>

          {/* 대상 부서 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">대상 부서 (복수 선택)</p>
            <div className="flex flex-wrap gap-2">
              {departments.map(d => (
                <button key={d.id} onClick={() => toggleDept(d.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    selDepts.includes(d.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* 알림 + 설명 */}
          <div className="flex gap-3 items-center flex-wrap">
            <label className="text-xs font-semibold text-gray-500">사전 알림</label>
            <select value={form.notify_days_before} onChange={e => setF('notify_days_before', Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
              {[3, 7, 14, 30].map(n => <option key={n} value={n}>{n}일 전</option>)}
            </select>
          </div>

          <textarea value={form.description} onChange={e => setF('description', e.target.value)}
            placeholder="교육 내용 메모 (선택)"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
          />

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button onClick={addEducation} disabled={adding || !form.title.trim() || !form.scheduled_date}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* ── 교육 목록 ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-14">
          <GraduationCap size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">교육 일정이 없습니다</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-blue-500 hover:underline">
            + 교육 등록하기
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(e => {
            const isOverdue = e.scheduled_date < today && e.status === '예정'
            const targets = e.education_targets ?? []
            return (
              <Link
                key={e.id}
                href={`/education/${e.id}`}
                className={`block bg-white rounded-xl border shadow-sm hover:shadow-md transition-all group ${
                  isOverdue ? 'border-red-200 bg-red-50/20' : 'border-gray-100'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      {/* 뱃지 행 */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${TYPE_META[e.edu_type].color}`}>
                          {TYPE_META[e.edu_type].icon} {e.edu_type}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CAT_COLORS[e.category] ?? CAT_COLORS['기타']}`}>
                          {e.category}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[e.status]}`}>
                          {e.status}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                            <AlertTriangle size={11} /> 기한 초과
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {e.title}
                      </h3>

                      {/* 메타 정보 */}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} /> {formatDate(e.scheduled_date)}
                          {e.duration_hours && ` · ${e.duration_hours}h`}
                        </span>
                        {e.instructor && <span className="flex items-center gap-1"><User size={11} /> {e.instructor}</span>}
                        {e.location   && <span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
                      </div>

                      {/* 대상 부서 태그 */}
                      {targets.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {targets.map((t: any) => (
                            <span key={t.department_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {t.departments?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <DdayBadge days={e.days_until} status={e.status} />
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
