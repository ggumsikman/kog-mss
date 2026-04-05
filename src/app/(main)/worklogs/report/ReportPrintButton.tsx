'use client'
import { Printer } from 'lucide-react'

export default function ReportPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors"
    >
      <Printer size={15} />
      인쇄 / PDF 저장
    </button>
  )
}
