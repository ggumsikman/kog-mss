import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import { notFound } from 'next/navigation'
import { calcDelayDays, formatDate, getStatusColor } from '@/lib/utils'
import { AlertTriangle, ArrowLeft, Calendar, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const role = currentUser?.role ?? 'employee'
  const today = new Date().toISOString().split('T')[0]

  const [{ data: project }, { data: milestones }, { data: members }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, departments(name), users(name, position)')
      .eq('id', id)
      .single(),
    supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', id)
      .order('due_date', { ascending: true }),
    supabase
      .from('project_members')
      .select('*, users(name, position, departments(name))')
      .eq('project_id', id),
  ])

  if (!project) notFound()

  const isDelayed = project.due_date < today && project.status !== '완료'
  const delayDays = isDelayed ? calcDelayDays(project.due_date) : 0
  const computedStatus = isDelayed ? '지연' : project.status

  const totalMs = milestones?.length ?? 0
  const doneMs = milestones?.filter(m => m.status === '완료').length ?? 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 상단 네비 */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        프로젝트 목록
      </Link>

      {/* 헤더 카드 */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-5 ${isDelayed ? 'border-red-200' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{project.category}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(computedStatus)}`}>
                {computedStatus}
              </span>
              {isDelayed && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  <AlertTriangle size={10} />
                  {delayDays}일 초과
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-3">{project.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Building2 size={13} />
                {project.departments?.name}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={13} />
                {project.users?.name} ({project.users?.position})
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {formatDate(project.start_date)} → <span className={isDelayed ? 'text-red-600 font-bold' : ''}>{formatDate(project.due_date)}</span>
              </span>
            </div>
            {project.description && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{project.description}</p>
            )}
          </div>

          {/* 진행률 원형 표시 */}
          <div className="flex flex-col items-center gap-1">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="36" cy="36" r="30"
                fill="none"
                stroke={isDelayed ? '#EF4444' : '#3B82F6'}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - project.progress_pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
              />
              <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill={isDelayed ? '#EF4444' : '#1F2937'}>
                {project.progress_pct}%
              </text>
            </svg>
            <span className="text-xs text-gray-400">진행률</span>
          </div>
        </div>

        {/* 마일스톤 요약 */}
        {totalMs > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <span className="text-xs text-gray-500">마일스톤</span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.round(doneMs / totalMs * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{doneMs}/{totalMs} 완료</span>
          </div>
        )}
      </div>

      {/* 클라이언트 인터랙션 영역 */}
      <ProjectDetailClient
        project={project}
        milestones={milestones ?? []}
        members={members ?? []}
        isDelayed={isDelayed}
        role={role}
      />
    </div>
  )
}
