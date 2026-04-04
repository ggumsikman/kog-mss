import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Calendar, User, Building2, Archive, FileText } from 'lucide-react'
import Link from 'next/link'
import DocumentDetailClient from './DocumentDetailClient'

const STATUS_META: Record<string, { color: string; bg: string }> = {
  '접수':   { color: 'text-blue-700',   bg: 'bg-blue-100' },
  '처리중': { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  '완료':   { color: 'text-green-700',  bg: 'bg-green-100' },
  '폐기':   { color: 'text-gray-500',   bg: 'bg-gray-100' },
}

const ACTION_META: Record<string, { color: string; dot: string; label: string }> = {
  '접수':  { color: 'text-blue-700',   dot: 'bg-blue-500',   label: '접수' },
  '배포':  { color: 'text-purple-700', dot: 'bg-purple-500', label: '배포' },
  '처리':  { color: 'text-yellow-700', dot: 'bg-yellow-500', label: '처리' },
  '반려':  { color: 'text-red-700',    dot: 'bg-red-500',    label: '반려' },
  '완료':  { color: 'text-green-700',  dot: 'bg-green-500',  label: '완료' },
  '폐기':  { color: 'text-gray-500',   dot: 'bg-gray-400',   label: '폐기' },
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'

  const [{ data: doc }, { data: histories }, { data: users }] = await Promise.all([
    supabase
      .from('official_documents')
      .select(`*, users!received_by(name, position), handler:users!handler_id(name, position), departments(name)`)
      .eq('id', id)
      .single(),
    supabase
      .from('document_histories')
      .select('*, users(name, position)')
      .eq('document_id', id)
      .order('action_at', { ascending: true }),
    supabase.from('users').select('id, name, position, departments(name)').eq('is_active', true).order('name'),
  ])

  if (!doc) notFound()

  const today = new Date().toISOString().split('T')[0]
  const daysSince = Math.floor(
    (new Date(today).getTime() - new Date(doc.received_date).getTime()) / 86400000
  )
  const isOverdue = ['접수', '처리중'].includes(doc.status) && daysSince >= 3
  const deptName = Array.isArray(doc.departments) ? doc.departments[0]?.name : doc.departments?.name

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={14} /> 공문서 목록
      </Link>

      {/* 헤더 카드 */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-5 ${isOverdue ? 'border-red-200' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_META[doc.status]?.bg} ${STATUS_META[doc.status]?.color}`}>
                {doc.status}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{doc.category}</span>
              {isOverdue && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  ⚠ {daysSince}일째 미처리
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-1">{doc.title}</h1>
            {doc.doc_number && <p className="text-xs text-gray-400 mb-3">{doc.doc_number}</p>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { icon: <Building2 size={13} />, label: '발신처', value: doc.sender },
                { icon: <Calendar size={13} />,  label: '접수일', value: formatDate(doc.received_date) },
                { icon: <User size={13} />,      label: '접수자', value: doc.users?.name },
                { icon: <Building2 size={13} />, label: '담당부서', value: deptName },
                { icon: <User size={13} />,      label: '담당자', value: doc.handler?.name ?? '미배정' },
                { icon: <Archive size={13} />,   label: '폐기 예정', value: doc.disposal_date ? formatDate(doc.disposal_date) : '-' },
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

            {doc.summary && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 mb-1">공문 요약</p>
                <p className="text-sm text-gray-700 leading-relaxed">{doc.summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 타임라인 (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-sm text-gray-800 mb-5 flex items-center gap-2">
            <FileText size={14} className="text-indigo-500" />
            처리 이력
          </h2>

          {(histories ?? []).length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">처리 이력이 없습니다</p>
          ) : (
            <div className="relative">
              {/* 세로 선 */}
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100" />
              <div className="space-y-5">
                {(histories ?? []).map((h: any, idx: number) => {
                  const meta = ACTION_META[h.action] ?? ACTION_META['처리']
                  const isLast = idx === (histories ?? []).length - 1
                  return (
                    <div key={h.id} className="flex gap-4 relative">
                      {/* 도트 */}
                      <div className={`w-7 h-7 rounded-full ${meta.dot} flex items-center justify-center flex-shrink-0 z-10 shadow-sm`}>
                        <span className="text-white text-xs font-black">{meta.label[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className={`text-sm font-bold ${meta.color}`}>{h.action}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(h.action_at).toLocaleString('ko-KR', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {h.users?.name} ({h.users?.position})
                        </p>
                        {h.note && (
                          <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1">{h.note}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 상태 변경 패널 (2/5) */}
        <div className="lg:col-span-2">
          <DocumentDetailClient
            doc={doc}
            users={users ?? []}
            documentId={Number(id)}
            role={role}
          />
        </div>
      </div>
    </div>
  )
}
