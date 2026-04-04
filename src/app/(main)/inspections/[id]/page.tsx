import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Building2, Calendar, RotateCcw, ShieldCheck, AlertTriangle, Clock, FileText } from 'lucide-react'
import Link from 'next/link'
import InspectionDetailClient from './InspectionDetailClient'

const RESULT_META: Record<string, { color: string; dot: string }> = {
  '합격':      { color: 'text-green-700',  dot: 'bg-green-500' },
  '조건부합격': { color: 'text-yellow-700', dot: 'bg-yellow-500' },
  '불합격':    { color: 'text-red-700',    dot: 'bg-red-500' },
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: ins }, { data: histories }] = await Promise.all([
    supabase
      .from('inspections')
      .select('*, departments(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('inspection_histories')
      .select('*')
      .eq('inspection_id', id)
      .order('inspection_date', { ascending: false }),
  ])

  if (!ins) notFound()

  const daysUntil = Math.ceil(
    (new Date(ins.next_due_date).getTime() - new Date(today).getTime()) / 86400000
  )
  const status: '정상' | '임박' | '만료' =
    daysUntil < 0 ? '만료' : daysUntil <= 30 ? '임박' : '정상'

  const STATUS_STYLE = {
    정상: { color: 'text-green-700',  bg: 'bg-green-100',  icon: ShieldCheck },
    임박: { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
    만료: { color: 'text-red-700',    bg: 'bg-red-100',    icon: AlertTriangle },
  }
  const style = STATUS_STYLE[status]
  const StatusIcon = style.icon
  const deptName = Array.isArray(ins.departments) ? ins.departments[0]?.name : ins.departments?.name

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/inspections" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={14} /> 정기검사 목록
      </Link>

      {/* 헤더 카드 */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-5 ${status === '만료' ? 'border-red-200' : status === '임박' ? 'border-yellow-200' : 'border-gray-100'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}>
            <StatusIcon size={22} className={style.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${style.bg} ${style.color}`}>{status}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">{ins.category}</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-3">{ins.title}</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { icon: <Building2 size={13} />, label: '담당부서', value: deptName },
                { icon: <RotateCcw size={13} />, label: '법정 주기', value: `${ins.legal_cycle_months}개월` },
                { icon: <Calendar size={13} />,  label: '최근 검사일', value: ins.last_inspection_date ? formatDate(ins.last_inspection_date) : '-' },
                { icon: <Calendar size={13} />,  label: '다음 검사일', value: formatDate(ins.next_due_date) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-semibold text-gray-700">{value ?? '-'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className={`text-2xl font-black ${style.color}`}>
                {daysUntil < 0 ? `D+${Math.abs(daysUntil)}` : daysUntil === 0 ? 'D-Day' : `D-${daysUntil}`}
              </span>
              <span className="text-sm text-gray-400">
                {daysUntil < 0 ? `${Math.abs(daysUntil)}일 경과` : daysUntil === 0 ? '오늘 검사일' : `${daysUntil}일 남음`}
              </span>
            </div>

            {ins.note && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{ins.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 검사 이력 (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-sm text-gray-800 mb-5 flex items-center gap-2">
            <FileText size={14} className="text-indigo-500" />
            검사 이력
          </h2>

          {(histories ?? []).length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">검사 이력이 없습니다</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100" />
              <div className="space-y-5">
                {(histories ?? []).map((h: any, idx: number) => {
                  const rm = RESULT_META[h.result] ?? RESULT_META['합격']
                  return (
                    <div key={h.id} className="flex gap-4 relative">
                      <div className={`w-7 h-7 rounded-full ${rm.dot} flex items-center justify-center flex-shrink-0 z-10 shadow-sm`}>
                        <span className="text-white text-xs font-black">{h.result?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-sm font-bold ${rm.color}`}>{h.result}</span>
                          <span className="text-xs text-gray-400">{formatDate(h.inspection_date)}</span>
                        </div>
                        {h.inspector_agency && (
                          <p className="text-xs text-gray-500 mt-0.5">검사기관: {h.inspector_agency}</p>
                        )}
                        {h.next_due_date && (
                          <p className="text-xs text-gray-500">다음 검사일: {formatDate(h.next_due_date)}</p>
                        )}
                        {h.note && (
                          <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1">{h.note}</p>
                        )}
                        {h.certificate_url && (
                          <a href={h.certificate_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                            검사성적서 보기 →
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 검사 기록 패널 (2/5) */}
        <div className="lg:col-span-2">
          <InspectionDetailClient
            inspectionId={Number(id)}
            legalCycleMonths={ins.legal_cycle_months}
            today={today}
          />
        </div>
      </div>
    </div>
  )
}
