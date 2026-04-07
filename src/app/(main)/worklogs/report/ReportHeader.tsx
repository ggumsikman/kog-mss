'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import ReportPrintButton from './ReportPrintButton'

export default function ReportHeader({
  type,
  baseDate,
  today,
}: {
  type: string
  baseDate: string
  today: string
}) {
  return (
    <div className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-50">
      <Link href={`/worklogs${baseDate !== today ? `?date=${baseDate}` : ''}`}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <X size={16} />
        닫기
      </Link>
      <div className="h-4 w-px bg-gray-200" />

      {(['daily', 'weekly', 'monthly'] as const).map(t => (
        <Link
          key={t}
          href={`/worklogs/report?type=${t}&date=${baseDate}`}
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
          if (d) window.location.href = `/worklogs/report?type=${type}&date=${d}`
        }}
      />

      <div className="ml-auto">
        <ReportPrintButton />
      </div>
    </div>
  )
}
