'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import ReportPrintButton from './ReportPrintButton'

export default function ReportHeader({
  type,
  baseDate,
  today,
  deptId,
  departments = [],
}: {
  type: string
  baseDate: string
  today: string
  deptId?: string
  departments?: { id: number; name: string }[]
}) {
  const router = useRouter()

  function buildUrl(overrides: { type?: string; date?: string; dept?: string }) {
    const t = overrides.type ?? type
    const d = overrides.date ?? baseDate
    const dp = overrides.dept ?? deptId
    const params = new URLSearchParams({ type: t, date: d })
    if (dp) params.set('dept', dp)
    return `/worklogs/report?${params.toString()}`
  }

  return (
    <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-50 flex-wrap">
      <Link href={`/worklogs${baseDate !== today ? `?date=${baseDate}` : ''}`}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <X size={16} />
        닫기
      </Link>
      <div className="h-4 w-px bg-gray-200" />

      {(['daily', 'weekly', 'monthly'] as const).map(t => (
        <Link
          key={t}
          href={buildUrl({ type: t })}
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            type === t
              ? 'bg-[#1A2744] text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {t === 'daily' ? '당일' : t === 'weekly' ? '주간' : '월간'}
        </Link>
      ))}

      <input
        type={type === 'monthly' ? 'month' : 'date'}
        defaultValue={type === 'monthly' ? baseDate.slice(0, 7) : baseDate}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
        onChange={(e) => {
          const v = e.target.value
          const d = type === 'monthly' ? v + '-01' : v
          if (d) router.push(buildUrl({ date: d }))
        }}
      />

      {/* 부서 필터 */}
      <select
        value={deptId ?? ''}
        onChange={(e) => router.push(buildUrl({ dept: e.target.value }))}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
      >
        <option value="">전체 부서</option>
        {departments.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <div className="ml-auto">
        <ReportPrintButton />
      </div>
    </div>
  )
}
